const path = require("path");
const fs = require("fs");
const request = require("request");
const package = require(path.join(__dirname, "..", "package.json"));
const PATH = path.join(__dirname, "..", "public", "contributors.txt");
const NEWLINE = "\n";
const BLURB = "# For a list that is guaranteed to be up-to-date, visit https://github.com/z-------------/CPod/graphs/contributors";

let tries = 0;
const MAX_TRIES = 5;

function doTheThing() {
  request({
    url: "https://api.github.com/repos/z-------------/CPod/stats/contributors",
    headers: {
      "User-Agent": `CPod v${package.version} (github.com/z-------------)`
    }
  }, (err, res, body) => {
    body = JSON.parse(body);

    if (Array.isArray(body)) {
      let contributors = [];
      for (let contributor of body) {
        contributors.push(contributor.author.login);
      }
      contributors.sort(function(a, b) {
        let al = a.toLowerCase();
        let bl = b.toLowerCase();
        if (al < bl) return -1;
        if (al > bl) return 1;
        return 0;
      });

      let text = BLURB + NEWLINE + NEWLINE + contributors.join(NEWLINE);

      fs.writeFile(PATH, text + NEWLINE, err => {
        if (err) throw err;
        console.log("contributors.js succeeded.");
      });
    } else {
      tries++;
      if (tries <= MAX_TRIES) {
        doTheThing();
      } else {
        console.error("contributors.js failed after " + MAX_TRIES + " tries.");
      }
    }
  });
}

doTheThing();
