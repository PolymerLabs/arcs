
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

const assert = require('chai').assert;
var SuggestionComposer = require("../suggestion-composer.js");
let util = require('./test-util.js');

describe('suggestion-composer', function() {
  it('add-suggestions', function() {
    let suggestComposer = new SuggestionComposer({});
    let recipes = [
        {'description': 'A', 'rank': 10, 'components': []},
        {'description': 'B', 'rank': 5, 'components': []},
        {'description': 'C', 'rank': 100, 'components': []},
        {'description': 'D', 'rank': 20, 'components': []},
        {'description': 'E', 'rank': 7, 'components': []}];
    suggestComposer.setSuggestions(recipes, /* arc= */ {});

    assert.equal(4, suggestComposer._suggestions.length);
    assert.deepEqual(['C', 'D', 'A', 'E'], suggestComposer._suggestions.map(s => s.name));
  });
});
