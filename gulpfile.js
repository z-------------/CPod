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
  "./public/app/js/basic.js",
  "./public/app/js/cbus-const.js",
  "./public/app/js/cbus-settings.js",
  "./public/app/js/cbus-broadcast.js",
  "./public/app/js/cbus-audio.js",
  "./public/app/js/cbus-ui.js",
  "./public/app/js/cbus-data.js",
  "./public/app/js/cbus-sync.js",
  "./public/app/js/cbus-server-search-podcasts.js",
  "./public/app/js/cbus-server-update.js",
  "./public/app/js/cbus-server-get-podcast-info.js",
  "./public/app/js/cbus-server-generate-opml.js",
  "./public/app/js/cbus-server-get-popular-podcasts.js",
  "./public/app/js/main.js"
];

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
  const uglify = require("gulp-uglify-es").default;

  return gulp.src(jsSrc)
    .pipe(sourcemaps.init())
    .pipe(concat("all.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./public/app/js"));
});

// watch

gulp.task("watch", function() {
  gulp.watch("./public/app/index.pug", ["pug"]);
  gulp.watch("./public/app/style.scss", ["sass"]);
  gulp.watch("./public/app/js/*.js", ["js-no-uglify"]);
});

// batch tasks

gulp.task("default", ["pug", "sass", "js"]);
gulp.task("both", ["pug", "sass", "js", "watch"]);
