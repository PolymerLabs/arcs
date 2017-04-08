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

class Save extends Particle {

  setViews(views) {
    var list = views.get("list");
    var watermark = 0;

    this.on(views, 'inputs', 'change', async e => {
      var inputsView = views.get('inputs');
      util.logDebug("Save", "ephemeral in", "inputs", inputsView);
      var inputList = await inputsView.toList();
      inputList.slice(watermark).map(a => list.store(a));
      watermark = inputList.length;
      util.logDebug("Save", "out", "list", list);
    });
  }
}

module.exports = Save;
