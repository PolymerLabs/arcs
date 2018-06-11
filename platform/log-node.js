// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// TODO(wkorman): Incorporate debug levels. Consider outputting
// preamble in the specified color via ANSI escape codes. Consider
// sharing with similar log factory logic in `xen.js`.
const logFactory = (preamble, color, log='log') => {
  return console[log].bind(console, `(${preamble})`);
};

export {logFactory};
