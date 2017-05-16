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

const Loader = require('./loader');

module.exports = class BrowserLoader extends Loader {
  constructor(base) {
    super();
    this._base = base || '';
  }
  loadFile(name) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', this._base + name, false);
    xhr.send();
    return xhr.responseText;
  }
  requireParticle(name) {
    let filename = this._base + this.particleLocationFor(name, 'js');
    let result = [];
    self.defineParticle = function(particleWrapper) {
      result.push(particleWrapper);
    };
    importScripts(filename);
    delete self.defineParticle;
    return this.unwrapParticle(result[0]);
  }
};
