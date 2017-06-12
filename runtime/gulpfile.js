// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const gulp = require('gulp');

gulp.task('build', async function() {
  const webpack = require('webpack');

  let node = {
    fs: 'empty',
    mkdirp: 'empty',
    minimist: 'empty',
  };

  for (let file of [
    './browser/browser-test/browser-test.js',
    './browser/browser-demo/browser-demo.js',
    './browser/browser-vr-demo/browser-vr-demo.js',
    './browser/particle-ui-tester/particle-ui-tester.js',
    './browser/worker-entry.js',
  ]) {
    await new Promise((resolve, reject) => {
      webpack({
        entry: file,
        output: {
          filename: 'browser/build/' + file,
        },
        node,
        devtool: 'sourcemap',
      }, (err, stats) => {
        if (err) {
          reject(err);
        }
        console.log(stats.toString({colors: true, verbose: true}));
        resolve();
      });
    });
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
  gulp.watch(['**', '!browser/build/**'], ['build', 'test']);
});

gulp.task('default', ['build', 'test']);

gulp.task('dev', function() {
  gulp.watch(['**', '!browser/build/**'], ['build']);
});

