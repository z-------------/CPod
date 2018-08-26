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
  const uglify = require("gulp-uglify-es").default;

  return gulp.src(jsSrc)
    .pipe(sourcemaps.init())
    .pipe(concat("all.js"))
    .pipe(gulp.dest("./public/app/js"))
    .pipe(rename("all.js"))
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./public/app/js"));
});

gulp.task("js-no-uglify", function() {
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
      url: "https://api.github.com/repos/z-------------/CPod/stats/contributors",
      headers: {
        "User-Agent": `CPod v${pkg.version} (github.com/z-------------)`
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
    let parsed = JSON.parse(contents);

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

// watch

gulp.task("watch", function() {
  gulp.watch("./public/app/index.pug", ["pug"]);
  gulp.watch("./public/app/style.scss", ["sass"]);
  gulp.watch("./public/app/js/*.js", ["js-no-uglify"]);
  gulp.watch("./locales/en.json", ["i18n"]);
});

// batch tasks

gulp.task("default", ["pug", "sass", "js", "contributors"]);
gulp.task("both", ["default", "watch"]);
