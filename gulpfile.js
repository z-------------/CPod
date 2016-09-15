var gulp = require("gulp");

// sass

gulp.task("sass", function() {
    var postcss = require("gulp-postcss");
    var autoprefixer = require("autoprefixer");
    var concat = require("gulp-concat");
    var sass = require("gulp-sass");

    return gulp.src("./public/app/style.scss")
        .pipe(sass().on("error", sass.logError))
        .pipe(postcss([ autoprefixer({ browsers: ["last 2 versions"] }) ]))
        .pipe(gulp.dest("./public/app/"));
});

// jade

gulp.task("pug", function() {
    var pug = require("gulp-pug");

    gulp.src("./public/app/index.pug")
        .pipe(pug())
        .pipe(gulp.dest("./public/app/"));
});

// watch

gulp.task("watch", function() {
    gulp.watch("./public/app/index.pug", ["pug"]);
    gulp.watch("./public/app/style.scss", ["sass"]);
});

// everything

gulp.task("default", ["pug", "sass", "watch"]);
