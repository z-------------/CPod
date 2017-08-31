var gulp = require("gulp");

// sass

gulp.task("sass", function() {
  var postcss = require("gulp-postcss");
  var autoprefixer = require("autoprefixer");
  var sass = require("gulp-sass");

  return gulp.src("./public/app/style.scss")
    .pipe(sass().on("error", sass.logError))
    .pipe(postcss([ autoprefixer({ browsers: ["last 2 versions"] }) ]))
    .pipe(gulp.dest("./public/app/"));
});

// jade

gulp.task("pug", function() {
  var pug = require("gulp-pug");

  return gulp.src("./public/app/index.pug")
    .pipe(pug())
    .pipe(gulp.dest("./public/app/"));
});

// js

gulp.task("js", function() {
  var concat = require("gulp-concat");
  var sourcemaps = require("gulp-sourcemaps");

  return gulp.src([
      "./public/app/js/basic.js",
      "./public/app/js/cbus-const.js",
      "./public/app/js/cbus-broadcast.js",
      "./public/app/js/cbus-audio.js",
      "./public/app/js/cbus-ui.js",
      "./public/app/js/cbus-data.js",
      "./public/app/js/cbus-server-search-podcasts.js",
      "./public/app/js/cbus-server-update.js",
      "./public/app/js/cbus-server-get-podcast-info.js",
      "./public/app/js/cbus-server-generate-opml.js",
      "./public/app/js/main.js"
    ])
    .pipe(sourcemaps.init())
    .pipe(concat("all.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./public/app/js"));
});

// watch

gulp.task("watch", function() {
  gulp.watch("./public/app/index.pug", ["pug"]);
  gulp.watch("./public/app/style.scss", ["sass"]);
  gulp.watch("./public/app/js/*.js", ["js"]);
});

// everything

gulp.task("default", ["pug", "sass", "js"]);
