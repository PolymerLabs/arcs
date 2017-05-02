/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const assert = require('chai').assert;
const loader = require('../loader.js');

describe('schema', function() {

  it('schemas load recursively', function() {
    var schema = loader.loadSchema("Product");
    assert.deepEqual(schema.normative, {name: 'Text'});
    assert.deepEqual(schema.optional, {description: 'Text', image: 'URL'});
    assert.equal(schema.name, "Product");
    assert.equal(schema.parent.name, "Thing");
  });
});