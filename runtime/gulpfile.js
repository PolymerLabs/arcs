// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const gulp = require('gulp');

gulp.task('build', function() {
  const browserify = require('browserify');
  const source = require('vinyl-source-stream');
  const buffer = require('vinyl-buffer');
  const sourcemaps = require('gulp-sourcemaps');

  function build(file) {
  }

  for (let file of [
    'browser-test/browser-test.js',
    'browser-demo/browser-demo.js',
  ]) {
    browserify({
      entries: file,
      debug: true,
    }).bundle()
        .pipe(source(file))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./build/'));
  }
});

gulp.task('test', function() {
  const mocha = require('gulp-mocha');
  return gulp.src(['test/*.js'], {read: false})
    .pipe(mocha({reporter: 'list'}));
});

gulp.task('watch', function() {
  // TODO: Move all src to src/ so we can glob recursively here.
  gulp.watch(['*.js', 'test/**'], ['build', 'test']);
});

gulp.task('default', ['build', 'test']);
