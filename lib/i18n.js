const osLocale = require("os-locale");
const fs = require("fs");
const path = require("path");

let cache = {
  // locale: "es",
  defaultLocale: "en",
  availableLocales: [],
  locales: []
};

module.exports.__ = function(name) {
  module.exports.getLocale();

  if (!cache.locales[cache.locale]) {
    cache.locales[cache.locale] = module.exports.readLocaleFile(cache.locale);
  }

  if (!cache.locales[cache.defaultLocale]) {
    cache.locales[cache.defaultLocale] = module.exports.readLocaleFile(cache.defaultLocale);
  }

  if (arguments.length === 1) {
    return cache.locales[cache.locale][name] || cache.locales[cache.defaultLocale][name];
  } else {
    let string = cache.locales[cache.locale][name] || cache.locales[cache.defaultLocale][name];
    for (let i = 0, l = arguments.length - 1; i < l; i++) {
      string = string.replace("$" + i, arguments[1 + i]);
    }
    return string;
  }
};

module.exports.readLocaleFile = function(locale) {
  let localeData = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "locales", locale + ".json"),
    { encoding: "utf8" }
  ));
  if (localeData.__redirect__) {
    return JSON.parse(fs.readFileSync(
      path.join(__dirname, "..", "locales", localeData.__redirect__ + ".json"),
      { encoding: "utf8" }
    ));
  } else {
    return localeData;
  }
};

module.exports.doDOMReplacement = function() {
  let elems0 = document.getElementsByClassName("i18n");
  for (let i = 0, l = elems0.length; i < l; i++) {
    elems0[i].textContent = module.exports.__(elems0[i].dataset.i18nName);
  }

  let elems1 = document.getElementsByClassName("i18n-attr");
  for (let i = 0, l = elems1.length; i < l; i++) {
    let mappings = elems1[i].dataset.i18nMap.split(";");
    for (let j = 0, m = mappings.length; j < m; j++) {
      let keyVal = mappings[j].split(":");
      elems1[i].setAttribute(keyVal[0], module.exports.__(keyVal[1]));
    }
  }
};

module.exports.getLocale = function() {
  if (!cache.locale) {
    let systemLocale = osLocale.sync();
    let availableLocales = module.exports.getAvailableLocales();
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

module.exports.getAvailableLocales = function() {
  if (!cache.availableLocales.length) {
    let filenames = fs.readdirSync(path.join(__dirname, "..", "locales"));
    for (let i = 0, l = filenames.length; i < l; i++) {
      cache.availableLocales.push(filenames[i].split(".")[0]);
    }
  }
  return cache.availableLocales;
};
