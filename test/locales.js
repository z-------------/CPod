import test from "ava";

const fs = require("fs");
const path = require("path");

const localesPath = path.join(__dirname, "..", "locales");
const filenameRegex = /^[a-z][a-z](_[A-Z]+)*\.json$/;

test("locale files are valid", t => {
  const filenames = fs.readdirSync(localesPath);
  filenames.forEach(filename => {
    /* test filename */
    if (!filenameRegex.test(filename)) t.fail(`locale filename "${filename}" is invalid`);

    /* test file json */
    const content = fs.readFileSync(path.join(localesPath, filename), { encoding: "utf8" });
    let valid = false;
    try {
      JSON.parse(content);
      valid = true;
    } catch (e) {}
    if (!valid) t.fail(`locale file "${filename}" is invalid`);
  });

  t.pass(); // if nothing has failed so far
});
