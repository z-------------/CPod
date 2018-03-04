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
    cache.locales[cache.locale] = JSON.parse(fs.readFileSync(
      path.join(__dirname, "..", "locales", cache.locale + ".json"),
      { encoding: "utf8" }
    ));
  }

  if (arguments.length === 1) {
    return cache.locales[cache.locale][name];
  } else {
    let string = cache.locales[cache.locale][name];
    for (let i = 0, l = arguments.length - 1; i < l; i++) {
      string = string.replace("$" + i, arguments[1 + i]);
    }
    return string;
  }
};

module.exports.doDOMReplacement = function() {
  let elems0 = document.getElementsByClassName("i18n");
  for (let i = 0, l = elems0.length; i < l; i++) {
    elems0[i].textContent = module.exports.__(elems0[i].dataset.i18nName);
  }

  let elems1 = document.getElementsByClassName("i18n-attr");
  for (let i = 0, l = elems1.length; i < l; i++) {
    let split = elems1[i].dataset.i18nMap.split(":");
    elems1[i].setAttribute(split[0], module.exports.__(split[1]));
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
      cache.locale = cache.defaultLocale;
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
