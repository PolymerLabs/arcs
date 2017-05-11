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
    // dynamic loading not so bueno under browserify ...
    // preload these here so they:
    // (1) are in the browserify bundle
    // (2) have ids (paths) that browserify can resolve from this module
    switch (name) {
      case 'Create':
        return require("../particles/Create/Create.js");
      case 'Recommend':
        return require("../particles/Recommend/Recommend.js");
      case 'WishlistFor':
        return require("../particles/WishlistFor/WishlistFor.js");
      case 'ListView':
        return require("../particles/ListView/ListView.js");
      case 'Chooser':
        return require("../particles/Chooser/Chooser.js");
      case 'MultiChooser':
        return require("../particles/MultiChooser/MultiChooser.js");
    }
  }
}


