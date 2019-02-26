// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let logLevel = 0;
if (typeof window !== 'undefined') {
  logLevel = ('logLevel' in window) ? window.logLevel : logLevel;
  console.log(`log-web: binding logFactory to level [${logLevel}]`);
}

const _factory = (preamble, color, log='log') => console[log].bind(console, `%c${preamble}`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);
const factory = logLevel > 0 ? _factory : () => () => {};
let logFactory;
logFactory = (...args) => factory(...args);

if (typeof window !== 'undefined') {
  //logFactory = () => (...args) => document.body.appendChild(document.createElement('div')).innerText = args.join();
} else {
  logFactory = () => (...args) => postMessage(args.join());
}

export {logFactory};
