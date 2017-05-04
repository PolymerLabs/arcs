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
var runtime = require("../../runtime/runtime.js");

class WishlistFor extends Particle {

  setViews(views) {
    // TODO: Don't let this stay here.
    const Product = runtime.loader.loadEntity("Product");
    this.logDebug("person", views.get("person"));
    var wishlist = views.get('wishlist');
    ["a new bike!", "Fresh Puppies", "A packet of Tim Loh that never runs out"].map(p => wishlist.store(
      new Product({name: p})));
    this.logDebug("wishlist", wishlist);
  }
}

module.exports = WishlistFor;
