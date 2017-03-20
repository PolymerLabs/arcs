/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let {Relation, Entity, BasicEntity, Scope, internals} = require('../runtime.js');
let assert = require('chai').assert;

describe('entity', function() {
  it('can be created, stored, and restored', function() {
    let scope = new Scope();
    let entity = new BasicEntity('hello world');
    assert.isDefined(entity);
    scope.commit([entity]);

    let clone = scope._viewFor(scope.typeFor(entity).viewOf(scope)).get(entity[internals.identifier]);
    assert.isDefined(clone);
    assert.equal(clone.data, 'hello world');
    assert.notEqual(entity, clone);
  });
});

describe('relation', function() {
  it('can be created, stored, and restored', function() {
    let scope = new Scope();
    let relation = new Relation(new BasicEntity('thing1'), new BasicEntity('thing2'));
    assert.isDefined(relation);
    scope.commit([relation]);
    console.log(relation[internals.identifier]);
    console.log(scope._viewFor(scope.typeFor(relation)));
    let clone = scope._viewFor(scope.typeFor(relation)).get(relation[internals.identifier]);
    assert.isDefined(clone);
    assert.equal(clone.entities[0].data, 'thing1');
    assert.notEqual(relation, clone);
  });
});
