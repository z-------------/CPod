var gulp = require("gulp");

gulp.task("autoprefixer", function () {
    var postcss = require("gulp-postcss");
    var autoprefixer = require("autoprefixer-core");
    var concat = require("gulp-concat");

    return gulp.src("./public/app/style.unprefixed.css")
        .pipe(postcss([ autoprefixer({ browsers: ["last 2 versions"] }) ]))
        .pipe(concat("style.css"))
        .pipe(gulp.dest("./public/app/"));
});
