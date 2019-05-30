/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let logLevel = 0;

global.params = {};
for (let i=2, arg; (arg=process.argv[i]); i++) {
  let [name, value] = arg.split('=');
  name.trim();
  value = (value || '').trim();
  global.params[name] = value;
}

if ('log' in global.params) {
  const value = global.params.log;
  logLevel = value ? Number(value) : 2;
}
console.log(`setting logLevel = ${logLevel}`);

global.logLevel = logLevel;

