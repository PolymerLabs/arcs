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

class Recommend extends Particle {

  setViews(views) {
    this.on(views, 'population', 'change', e => {
      console.log("storing", e.toList()[1]);
      views.get('recommendations').store(e.toList()[1])
    });
  }
}

module.exports = Recommend;
