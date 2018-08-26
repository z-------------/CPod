const fs = require("fs");
const path = require("path");

const DEFAULT_LOCALE_CODE = "en";

let localeCode = process.argv[2];

if (localeCode) {
  fs.readFile(path.join(__dirname, "..", "locales", localeCode + ".json"), "utf8", (err, data) => {
    if (err) throw err;
    let localeData = JSON.parse(data);
    let localeName = localeData.__locale_name__;
    fs.readFile(path.join(__dirname, "..", "locales", DEFAULT_LOCALE_CODE + ".json"), "utf8", (err, data) => {
      if (err) throw err;
      let defaultLocaleData = JSON.parse(data);
      let defaultLocaleName = defaultLocaleData.__locale_name__;

      let localeKeys = [];
      let defaultLocaleKeys = [];
      let missingKeys = [];

      for (let key in localeData) {
        if (key.indexOf("__") !== 0) {
          localeKeys.push(key);
        }
      }

      for (let key in defaultLocaleData) {
        if (key.indexOf("__") !== 0) {
          defaultLocaleKeys.push(key);
          if (localeKeys.indexOf(key) === -1 || localeData[key] === "") {
            missingKeys.push(key);
          }
        }
      }

      let actualKeyCount = (defaultLocaleKeys.length - missingKeys.length);
      let percentage = actualKeyCount / defaultLocaleKeys.length * 100;

      console.log();
      console.log(`${localeCode} is ${Math.round(percentage * 10) / 10}% complete.`);
      console.log(`${DEFAULT_LOCALE_CODE}: ${defaultLocaleKeys.length} keys.`);
      console.log(`${localeCode}: ${actualKeyCount} keys.`);
      console.log();
      if (percentage !== 100) {
        console.log(`Missing keys (${missingKeys.length}): ${missingKeys.join(", ")}`);
      } else {
        console.log("No missing keys.");
      }
      console.log();
    });
  });
} else {
  console.log("No locale specified.");
}
