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
var Speculator = require('./speculator.js')

class Suggestinator {
  constructor() {
    this.resolver = new Resolver();
    this.speculator = new Speculator();
  }

  // TODO: implement me!
  _getSuggestions(arc) {

  }

  suggestinate(arc) {
    var suggestions = this._getSuggestions(arc);
    suggestions.map(suggestion => this.resolver.resolve(suggestion, arc));
    var rankings = suggestions.map(suggestion => this.speculator.speculate(arc, suggestion));
    for (var i = 0; i < suggestions.length; i++)
      suggestions[i].rank = rankings[i];
    suggestions.sort((a,b) => a.rank - b.rank);
    return suggestions;
  }
}

module.exports = Suggestinator;
