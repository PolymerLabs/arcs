/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

import Loader from './loader';

export default class BrowserLoader extends Loader {
  constructor(base) {
    super();
    // TODO: Update all callers to pass a valid base URL to avoid the use of
    //       location here. `new URL(base)` should be valid.
    this._base = new URL(base || '', global.location).href;
  }
  _resolve(path) {
    return new URL(path, this._base).href;
  }
  loadResource(name) {
    return this._loadURL(this._resolve(name));
  }
  async requireParticle(fileName) {
    fileName = this._resolve(fileName);
    let result = [];
    self.defineParticle = function(particleWrapper) {
      result.push(particleWrapper);
    };
    importScripts(fileName);
    delete self.defineParticle;
    return this.unwrapParticle(result[0]);
  }
};
