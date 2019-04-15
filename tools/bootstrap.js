// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const src = 'tools/sigh.ts';
const dst = 'build/sigh.js';

if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) {
  console.log('Building sigh');
  const cmd = path.normalize('node_modules/.bin/tsc');
  const res = child_process.spawnSync(cmd, ['-p', 'tools'], {stdio: 'inherit'});
  if (res.status !== 0 || res.error) {
    process.exit(1);
  }
}

const child = child_process.fork('build/sigh.js', process.argv.slice(2));
child.on('exit', status => process.exit(status));
