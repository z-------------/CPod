const path = require("path");
const fs = require("fs");

const credKeys = [];
const CREDS_FILE_PATH = path.join(__dirname, "..", "creds.json");

let json = {};

for (let credKey of credKeys) {
  if (process.env.hasOwnProperty(credKey)) {
    json[credKey.substring(5)] = process.env[credKey]; // remove "CBUS_" prefix
  }
}

fs.writeFile(CREDS_FILE_PATH, JSON.stringify(json), (err) => {
  if (err) throw err;
});
