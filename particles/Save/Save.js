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

var Particle = require("../../runtime/particle.js").Particle;

class Save extends Particle {

  dataUpdated() {
    var list = this.inputs.asList();
    if (this.watermark == undefined)
      this.watermark = 0;
    if (list.length > this.watermark) {
      this.list = list.slice(this.watermark);
      this.watermark = list.length;
      this.commitData(5);
    }
  }
}

module.exports = Save;
