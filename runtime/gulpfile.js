// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import gulp from 'gulp';
import gutil from 'gulp-util';
import peg from 'gulp-peg';

const paths = {
  build: './build',
};

const sources = {
  peg: [
    'manifest-parser.peg',
  ],
  browser: [
    'test/test.js',
    'demo/demo.js',
    'env/environment.js',
    'vr-demo/vr-demo.js',
    'particle-ui-tester/particle-ui-tester.js',
    'worker-entry.js',
    'planner.js'
  ],
};

gulp.task('peg', function() {
  gulp
    .src(sources.peg)
    .pipe(peg().on('error', gutil.log))
    .pipe(gulp.dest(paths.build));
});

gulp.task('webpack', async function() {
  try {
    import webpack from 'webpack';

    let node = {
      fs: 'empty',
      mkdirp: 'empty',
      minimist: 'empty',
    };

    for (let file of sources.browser) {
      await new Promise((resolve, reject) => {
        webpack({
          entry: `./browser/${file}`,
          output: {
            filename: `./browser/build/${file}`,
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

  } catch(x) {
    // in case of emergency, break glass .. then stay calm and carry on watching
    console.log(x);
  }
});

gulp.task('build', ['peg', 'webpack']);

gulp.task('test', ['peg'], function() {
  import mocha from 'gulp-mocha';
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
  gulp.watch(['**', '!browser/build/**', '!node_modules'], ['build', 'test']);
});

gulp.task('default', ['build', 'test']);

gulp.task('dev', function() {
  gulp.watch(['**', '!browser/build/**', '!node_modules'], ['webpack']);
});
