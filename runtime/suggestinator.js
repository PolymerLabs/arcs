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

var Resolver = require('./resolver.js');
var Speculator = require('./speculator.js');
var tracing = require('tracelib');

class Suggestinator {
  constructor() {
    this.speculator = new Speculator();
  }

  // TODO: implement me!
  _getSuggestions(arc) {

  }

  async suggestinate(arc) {
    var trace = tracing.start({cat: "suggestinator", name: "Suggestinator::suggestinate"});
    var suggestions = this._getSuggestions(arc);
    trace.update({suggestions: suggestions.length});
    var Product = arc._loader.loadEntity("Product");

    suggestions = suggestions.filter(suggestion => Resolver.resolve(suggestion, arc));

    for (var suggestion of suggestions)
      suggestion.rank = await this.speculator.speculate(arc, suggestion);
  
    suggestions.sort((a,b) => a.rank - b.rank);
    trace.end({args: {resolved: suggestions.length}});
    return suggestions;
  }
}

module.exports = Suggestinator;
