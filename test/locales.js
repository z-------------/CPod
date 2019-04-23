import test from "ava";

const fs = require("fs");
const path = require("path");

const localesPath = path.join(__dirname, "..", "locales");
fs.readdir(localesPath, (err, filenames) => {
  if (err) throw err;
  
  const filenameRegex = /^[a-z][a-z](_[A-Z]+)*\.json$/;
  filenames.forEach(filename => {
    test(`locale filename "${filename}" is valid`, t => {
      t.true(filenameRegex.test(filename));
    });
  });

  filenames.forEach(filename => {
    const content = fs.readFileSync(path.join(localesPath, filename), { encoding: "utf8" });
    let valid = false;
    try {
      JSON.parse(content);
      valid = true;
    } catch (e) {}
    test(`locale file "${filename}" is valid`, t => t.true(valid));
  });
});
