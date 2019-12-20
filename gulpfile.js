const gulp = require("gulp");

// sass

gulp.task("sass", function() {
  const postcss = require("gulp-postcss");
  const autoprefixer = require("autoprefixer");
  const sass = require("gulp-sass");

  return gulp.src("./public/app/style.scss")
    .pipe(sass().on("error", sass.logError))
    .pipe(postcss([ autoprefixer({ browsers: ["last 8 Chrome versions"] }) ]))
    .pipe(gulp.dest("./public/app/"));
});

// jade

gulp.task("pug", function() {
  const pug = require("gulp-pug");

  return gulp.src("./public/app/index.pug")
    .pipe(pug())
    .pipe(gulp.dest("./public/app/"));
});

// js

const jsSrc = [
  "basic.js",
  "cbus-const.js",
  "cbus-settings.js",
  "cbus-broadcast.js",
  "cbus-audio.js",
  "cbus-ui.js",
  "cbus-data.js",
  "cbus-sync.js",
  "cbus-server-search-podcasts.js",
  "cbus-server-update.js",
  "cbus-server-get-podcast-info.js",
  "cbus-server-generate-opml.js",
  "cbus-server-get-popular-podcasts.js",
  "main.js"
].map(filename => "./public/app/js/" + filename);

gulp.task("js", function() {
  const concat = require("gulp-concat");
  const sourcemaps = require("gulp-sourcemaps");
  const rename = require("gulp-rename");

  return gulp.src(jsSrc)
    .pipe(sourcemaps.init())
    .pipe(concat("all.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./public/app/js"));
});

// contributors

gulp.task("contributors", function(done) {
  const path = require("path");
  const fs = require("fs");
  const request = require("request");

  const pkg = require(path.join(__dirname, "package.json"));

  const PATH = path.join(__dirname, "public", "contributors.txt");
  const BLURB = "# For a list that is guaranteed to be up-to-date, visit https://github.com/z-------------/CPod/graphs/contributors";
  const MAX_TRIES = 5;

  let tries = 0;

  function doTheThing() {
    request({
      url: "https://api.github.com/repos/z-------------/CPod/contributors",
      headers: {
        "User-Agent": `CPod v${pkg.version} (github.com/z-------------)`
      }
    }, (err, res, body) => {
      body = JSON.parse(body);

      if (Array.isArray(body)) {
        let contributors = [];
        for (let contributor of body) {
          contributors.push(contributor.login);
        }
        contributors.sort(function(a, b) {
          let al = a.toLowerCase();
          let bl = b.toLowerCase();
          if (al < bl) return -1;
          if (al > bl) return 1;
          return 0;
        });

        let text = BLURB + "\n\n" + contributors.join("\n");

        fs.writeFile(PATH, text + "\n", err => {
          if (err) throw err;
          done();
        });
      } else {
        tries++;
        if (tries <= MAX_TRIES) {
          doTheThing();
        } else {
          done(new Error(`contributors.js failed after ${MAX_TRIES} tries`));
        }
      }
    });
  }

  doTheThing();
});

// i18n key copier

gulp.task("i18n", function() {
  const fs = require("fs");
  const path = require("path");

  function getLocalePath(locale) {
    return path.join(__dirname, "locales", `${locale}.json`);
  }

  function getOrderedLocale(locale) {
    let filepath = path.join(__dirname, "locales", `${locale}.json`);
    let contents = fs.readFileSync(filepath, { encoding: "utf8" });
    let lines = contents.split("\n");
    let keys = [];
    let vals = [];
    for (let i = 1; i < lines.length - 2; i++) { // exclude { and }
      let trimmed = lines[i].trim();
      if (trimmed[trimmed.length - 1] === ",") {
        trimmed = trimmed.substring(0, trimmed.length - 1)
      }
      let parsed = JSON.parse(`{ ${trimmed} }`); // dirty, I know
      let key = Object.keys(parsed)[0];
      keys.push(key || "");
      vals.push(parsed[key] || "");
    }
    return {
      keys: keys,
      vals: vals,
      object: JSON.parse(contents)
    };
  }

  function jsonEscape(string) {
    stringified = JSON.stringify({ "_": string }); // {"_":"string"}
    return stringified.substring(6, stringified.length - 2);
  };

  const INDENT = "  "; // two spaces -- the only correct choice.

  let defaultLocale = "en";
  let orderedDefault = getOrderedLocale(defaultLocale);
  let locales = fs.readdirSync(path.join(__dirname, "locales"))
    .map(filename => filename.split(".")[0])
    .filter(locale => locale !== defaultLocale);

  locales.forEach(locale => {
    let filepath = getLocalePath(locale);
    let contents = fs.readFileSync(filepath, { encoding: "utf8" });
    let parsed;

    if (contents.trim().length) {
      parsed = JSON.parse(contents);
    } else {
      parsed = {};
    }

    if (!parsed.hasOwnProperty("__redirect__")) {
      let lines = [];

      orderedDefault.keys.forEach((key, i) => {
        if (key === "") {
          lines.push("");
        } else {
          let val = "";
          if (parsed.hasOwnProperty(key)) {
            val = parsed[key];
          }
          lines.push(`${INDENT}"${key}": "${jsonEscape(val)}"${i === orderedDefault.keys.length - 1 ? "" : ","}`);
        }
      });

      let joined = lines.join("\n");
      let output = `{\n${joined}\n}\n`;

      fs.writeFileSync(filepath, output);
    }
  });
});

// licenses

gulp.task("licenses", function() {
  const fs = require("fs");
  const path = require("path");

  const pkg = require("./package.json");

  const cpodLicense = `
Copyright 2015-2019 Zachary James Guard

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
  `;

  let deps = {};

  [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)].forEach(dep => {
    deps[dep] = { path: path.join("node_modules", dep) };
  });

  fs.readdirSync(path.join(__dirname, "public", "assets")).forEach(dep => {
    deps[dep] = { path: path.join("public", "assets", dep) };
  });

  let licensesHTML = "";

  let depsSorted = Object.keys(deps).sort(function(a, b) { return a.localeCompare(b) });

  for (let dep of depsSorted) {
    let depPath = path.join(__dirname, deps[dep].path);
    let filenames = fs.readdirSync(depPath);
    let filtered = filenames.filter(filename => {
      return /^(license|copying|unlicense)(\.\S+)*$/i.test(filename);
    });
    let insideHTML = "";
    if (filtered[0]) {
      insideHTML = fs.readFileSync(path.join(depPath, filtered[0]), { encoding: "utf8" });
    } else {
      let pkg = require(path.join(depPath, "package.json"));
      if (pkg.hasOwnProperty("licenses")) {
        let licenseNames = pkg.licenses.map(license => license.type.toLowerCase());
        licenseNames.forEach(license => {
          insideHTML += `<a href="https://choosealicense.com/licenses/${license.toLowerCase()}/" target="_blank">${license.toUpperCase()}</a>`
        });
      } else if (pkg.hasOwnProperty("license")) {
        insideHTML = `<a href="https://choosealicense.com/licenses/${pkg.license.toLowerCase()}/" target="_blank">${pkg.license.toUpperCase()}</a>`;
      }
    }
    licensesHTML += `<section>
  <h3>${dep}</h3>
  <pre>${insideHTML}</pre>
  </section>\n`;
  }

  let finalHTML = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Licenses - CPod</title>
      <style>
        body {
          font-family: "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen-Sans", "Ubuntu", "Cantarell", "Helvetica Neue", "Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK TC", "Noto Sans CJK KR", "Noto Sans CJK JP", sans-serif;
          background: #ffffff;
        }

        pre {
          font-family: "Iosevka", "Inconsolata", "Consolas", "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", "Monaco", "Courier New", "Courier", monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }
      </style>
    </head>
    <body>
      <h1>Licenses</h1>
      <section>
        <h3>CPod</h3>
        <pre>${cpodLicense}</pre>
      </section>
      <h2>Third-party licenses</h2>
      ${licensesHTML}
    </body>
  </html>`.replace(/\r\n/g, "\n");

  fs.writeFileSync(path.join(__dirname, "public", "licenses.html"), finalHTML);
});

// watch

gulp.task("watch", function() {
  gulp.watch("./public/app/index.pug", ["pug"]);
  gulp.watch("./public/app/style.scss", ["sass"]);
  gulp.watch("./public/app/js/*.js", ["js"]);
  gulp.watch("./locales/en.json", ["i18n"]);
  gulp.watch("./package.json", ["licenses"]);
});

// batch tasks

gulp.task("default", ["pug", "sass", "js", "licenses"]);
gulp.task("both", ["default", "watch"]);
