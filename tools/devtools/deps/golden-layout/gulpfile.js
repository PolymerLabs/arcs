/// BareSpecifier=golden-layout\gulpfile
// Deprecated but left here for now; use the gulp tasks in the Gruntfile.
var gulp = require('gulp');
var concat = require('gulp-concat');
var cConcat = require('gulp-continuous-concat');
var uglify = require('gulp-uglify');
var insert = require('gulp-insert');
var watch = require('gulp-watch');

gulp.task('dev', function () {
	return gulp.src(['./build/ns.js', './src/js/utils/utils.js', './src/js/utils/EventEmitter.js', './src/js/utils/DragListener.js', './src/js/**']).pipe(watch('./src/js/**')).pipe(cConcat('goldenlayout.js')).pipe(insert.wrap('(function($){', '})(window.$);')).pipe(gulp.dest('./dist'));
});

gulp.task('build', function () {
	return gulp.src(['./build/ns.js', './src/js/utils/utils.js', './src/js/utils/EventEmitter.js', './src/js/utils/DragListener.js', './src/js/**']).pipe(concat('goldenlayout.js')).pipe(insert.wrap('(function($){', '})(window.$);')).pipe(gulp.dest('./dist')).pipe(uglify()).pipe(concat('goldenlayout.min.js')).pipe(gulp.dest('./dist'));
});