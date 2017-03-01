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

var Resolver = require('./resolver.js')

class Suggestinator {
  constructor() {
    this.resolver = new Resolver();
  }

  // TODO: implement me!
  suggestinate(arc) {

  }

  load(arc, recipe) {
    this.resolver.resolve(recipe, arc);
    recipe.suggestions.forEach(suggestion => suggestion.instantiate(arc));
  }
}

module.exports = Suggestinator;
