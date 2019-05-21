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
    let json;
    try {
      json = JSON.parse(content);
    } catch (e) {
      t.fail(`locale file "${filename}" contains invalid JSON`);
    }

    /* test file contents */
    t.truthy(json["__redirect__"] || json["__locale_name__"], `locale file "${filename}" is missing both "__locale_name__" and "__redirect__"`);
  });

  t.pass(); // if nothing has failed so far
});
