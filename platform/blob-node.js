// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

// TODO(wkorman): Implement further perhaps via
// https://nodejs.org/api/buffer.html
export class Blob {
  constructor(values, options) {
    this._values = values;
    this._options = options;
  }
}
