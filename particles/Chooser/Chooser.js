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
var tracing = require("../../tracelib/trace.js");

class Chooser extends Particle {
  setViews(views) {
    this.on(views, 'choices', 'change', async e => {
      var inputList = await views.get('choices').toList();
      if (inputList.length > 0) {
        // say that I need an 'action' slot to continue
        var slot = await this.requireSlot('action'); // vs. this.whenSlot('action')
        slot.render('OMG CHOOSER');
      } else {
        this.releaseSlot('action');
      }
    });
  }
}

module.exports = Chooser;
