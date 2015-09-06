var gulp = require("gulp");

gulp.task("css", function() {
    var postcss = require("gulp-postcss");
    var autoprefixer = require("autoprefixer-core");
    var concat = require("gulp-concat");
    var sass = require("gulp-sass");

    return gulp.src("./public/app/style.unprefixed.scss")
        .pipe(sass().on("error", sass.logError))
        .pipe(postcss([ autoprefixer({ browsers: ["last 2 versions"] }) ]))
        .pipe(concat("style.css"))
        .pipe(gulp.dest("./public/app/"));
});

gulp.task("css:watch", function() {
    gulp.watch("./public/app/style.unprefixed.scss", ["css"]);
});
