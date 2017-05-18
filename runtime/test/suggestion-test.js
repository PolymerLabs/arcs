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
var suggest = require("../suggestion.js");
let util = require('./test-util.js');

describe('suggestion-manager', function() {
  it('add-suggestions', function() {
    let suggestManager = new suggest.SuggestionManager({});
    // Fill all available suggestion elements.
    assert.notEqual(undefined, suggestManager.addSuggestion("foo", 10, {}));
    assert.notEqual(undefined, suggestManager.addSuggestion("foo", 8, {}));
    assert.notEqual(undefined, suggestManager.addSuggestion("foo", 6, {}));
    assert.notEqual(undefined, suggestManager.addSuggestion("foo", 4, {}));

    // Cannot add a lower ranked suggestion.
    assert.equal(undefined, suggestManager.addSuggestion("foo", 1, {}));

    // Successfully add higher ranked suggestion.
    assert.notEqual(undefined, suggestManager.addSuggestion("foo", 5, {}));
  });
});
