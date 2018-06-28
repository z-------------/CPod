const osLocale = require("os-locale");
const fs = require("fs");
const path = require("path");

let cache = {
  // locale: "es",
  // canonicalLocale: "xx",
  defaultLocale: "en",
  availableLocales: [],
  canonicalLocales: [],
  locales: []
};

let i18n = {};

i18n.__ = function(name) {
  i18n.getLocale();

  let string = i18n.getLocaleData(cache.locale)[name] || i18n.getLocaleData(cache.defaultLocale)[name];
  if (!string) {
    let underscoreIndex = cache.locale.indexOf("_");
    if (underscoreIndex !== -1) {
      let localeBaseCode = cache.locale.substring(0, underscoreIndex);
      if (i18n.localeExists(localeBaseCode)) {
        string = i18n.getLocaleData(localeBaseCode)[name];
      }
    }
  }

  if (string) {
    if (arguments.length === 1) {
      return string;
    } else {
      for (let i = 0, l = arguments.length - 1; i < l; i++) {
        string = string.replace("$" + i, arguments[1 + i]);
      }
      return string;
    }
  } else {
    console.warn(`Missing string '${name}'. Locale: '${cache.locale}'.`)
  }
};

i18n.localeExists = function(locale) {
  return i18n.getAvailableLocales().indexOf(locale) !== -1;
};

i18n.getLocaleData = function(locale) {
  if (!cache.locales[locale]) {
    cache.locales[locale] = i18n.readLocaleFile(locale);
  }
  return cache.locales[locale];
};

i18n.readLocaleFile = function(locale) {
  let localeData = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "locales", locale + ".json"),
    { encoding: "utf8" }
  ));
  if (localeData.__redirect__) {
    let redirectedLocaleData = JSON.parse(fs.readFileSync(
      path.join(__dirname, "..", "locales", localeData.__redirect__ + ".json"),
      { encoding: "utf8" }
    ));
    redirectedLocaleData.__is_redirected__ = true;
    redirectedLocaleData.__canonical__ = localeData.__redirect__;
    return redirectedLocaleData;
  } else {
    return localeData;
  }
};

i18n.doDOMReplacement = function() {
  let elems0 = document.getElementsByClassName("i18n");
  for (let i = 0, l = elems0.length; i < l; i++) {
    elems0[i].innerHTML = i18n.__(elems0[i].dataset.i18nName);
  }

  let elems1 = document.getElementsByClassName("i18n-attr");
  for (let i = 0, l = elems1.length; i < l; i++) {
    let mappings = elems1[i].dataset.i18nMap.split(";");
    for (let j = 0, m = mappings.length; j < m; j++) {
      let keyVal = mappings[j].split(":");
      elems1[i].setAttribute(keyVal[0], i18n.__(keyVal[1]));
    }
  }
};

i18n.setLocale = function(locale) {
  if (i18n.localeExists(locale)) {
    cache.locale = locale;
    return true;
  }
  return false;
};

i18n.getLocale = function() {
  if (!cache.locale) {
    let systemLocale = osLocale.sync();
    let availableLocales = i18n.getAvailableLocales();
    if (availableLocales.indexOf(systemLocale) !== -1) {
      cache.locale = systemLocale;
    } else if (availableLocales.indexOf(systemLocale.split("_")[0]) !== -1) {
      cache.locale = systemLocale.split("_")[0];
    } else {
      var looseLocaleMatch;
      for (let i = 0, l = availableLocales.length; i < l; i++) {
        if (availableLocales[i].split("_")[0] === systemLocale.split("_")[0]) {
          looseLocaleMatch = availableLocales[i];
          break;
        }
      }
      if (looseLocaleMatch) {
        cache.locale = looseLocaleMatch;
      } else {
        cache.locale = cache.defaultLocale;
      }
    }
  }
  return cache.locale;
};

i18n.getCanonicalLocale = function() {
  i18n.getLocale();

  if (!cache.locales[cache.locale]) {
    cache.locales[cache.locale] = i18n.readLocaleFile(cache.locale);
  }
  if (cache.locales[cache.locale].__canonical__) {
    return cache.locales[cache.locale].__canonical__;
  } else {
    return cache.locale;
  }
};

i18n.getAvailableLocales = function(canonicalOnly) {
  if (!cache.availableLocales.length) {
    let filenames = fs.readdirSync(path.join(__dirname, "..", "locales"));
    for (let i = 0, l = filenames.length; i < l; i++) {
      cache.availableLocales.push(filenames[i].split(".")[0]);
    }
  }
  if (canonicalOnly) {
    return i18n.getCanonicalLocales();
  } else {
    return cache.availableLocales;
  }
};

i18n.getCanonicalLocales = function() {
  i18n.getAvailableLocales();

  if (!cache.canonicalLocales.length) {
    for (let i = 0, l = cache.availableLocales.length; i < l; i++) {
      if (!i18n.readLocaleFile(cache.availableLocales[i]).hasOwnProperty("__is_redirected__")) {
        cache.canonicalLocales.push(cache.availableLocales[i]);
      }
    }
  }
  return cache.canonicalLocales;
};

i18n.getDefaultLocale = function() {
  return cache.defaultLocale;
};

module.exports = i18n;
