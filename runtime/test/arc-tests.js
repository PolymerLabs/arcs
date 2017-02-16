/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var arc = require("../arc.js");
var data = require("../data-layer.js");
let assert = require('chai').assert;

var Foo = data.testing.testEntityClass('Foo');
var Bar = data.testing.testEntityClass('Bar');

describe('arc', function() {
  it('loads particles in response to suggestions', function() {
    var a = new arc.Arc();
    a.suggestinate = () => [{name: "TestParticle"}];
    var input = data.internals.viewFor(Foo.type);
    var output = data.internals.viewFor(Bar.type);
    a.addView(input);
    a.addView(output);
    a.load();
    input.store(new Foo("42"));
    a.tick();
    assert.equal(output.data.length, 1);
    assert.equal(output.data[0].data, "421");
  });
});
