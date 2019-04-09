// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function getModifiedTime(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return null;
    }
    throw e;
  }
}

const src_time = getModifiedTime('tools/sigh.ts');
const dst_time = getModifiedTime('build/sigh.js');

function spawn(cmd, ...args) {
  const res = child_process.spawnSync(path.normalize(cmd), args, {shell: true,  stdio: 'inherit'});
  return res.status === 0 && !res.error;
}

if (dst_time === null || src_time > dst_time) {
  console.log('Building sigh');
  if (!spawn('node_modules/.bin/tsc', '-p', 'tools')) {
    process.exit(1);
  }
}

process.exit(!spawn('node', 'build/sigh.js', ...process.argv.slice(2)));
