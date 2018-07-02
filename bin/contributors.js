const path = require("path");
const fs = require("fs");
const request = require("request");
const package = require(path.join(__dirname, "..", "package.json"));
const PATH = path.join(__dirname, "..", "public", "contributors.txt");
const NEWLINE = "\n";
const BLURB = "# For a list that is guaranteed to be up-to-date, visit https://github.com/z-------------/CPod/graphs/contributors";

request({
  url: "https://api.github.com/repos/z-------------/CPod/stats/contributors",
  headers: {
    "User-Agent": `CPod v${package.version} (github.com/z-------------)`
  }
}, (err, res, body) => {
  if (err) throw err;

  body = JSON.parse(body);
  let contributors = [];

  for (let contributor of body) {
    contributors.push(contributor.author.login);
  }

  let text = BLURB + NEWLINE + NEWLINE + contributors.join(NEWLINE);

  fs.writeFile(PATH, text + NEWLINE, err => {
    if (err) throw err;
  });
});
