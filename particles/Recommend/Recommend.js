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
let util = require("../../runtime/test/test-util.js");

class Recommend extends Particle {

  setViews(views) {
    this.on(views, 'population', 'change', e => {
      var populationView = views.get("population");
      populationView.toList().then(data => { 
        util.logDebug("Recommend", "in", "population", populationView);
        util.logDebug("Recommend", "in", "known", views.get("known"));
        views.get('recommendations').store(data[1])
        util.logDebug("Recommend", "out", "recommendations", views.get("recommendations"));
      });
    });
  }
}

module.exports = Recommend;
