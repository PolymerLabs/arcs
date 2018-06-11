// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const logFactory = (preamble, color, log='log') => {
  return console[log].bind(console, `%c${preamble}`,
      `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);
};

export {logFactory};
