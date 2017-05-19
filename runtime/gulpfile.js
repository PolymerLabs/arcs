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

  for (let file of [
    'browser-test/browser-test.js',
    'browser-demo/browser-demo.js',
    'worker-entry.js',
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
  // OMG gulp, why are you so hideously, hideously bad?
  // 
  // Pass the test you want to run in as a --param,
  // because that's basically the only way gulp lets
  // you do it.
  // e.g.
  // > gulp test --demo
  // to run tests that match "demo" 
  var args = process.argv[3];
  if (args !== undefined)
    args = args.substring(2);

  return gulp.src(['test/*.js'], {read: false})
    .pipe(mocha({reporter: 'list', grep: args}));
});

gulp.task('watch', function() {
  gulp.watch(['**', '!build/**'], ['build', 'test']);
});

gulp.task('default', ['build', 'test']);
