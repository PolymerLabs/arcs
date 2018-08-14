/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from './chai-web.js';

import {Type} from '../ts-build/type.js';
import {Schema} from '../ts-build/schema.js';
import {TypeVariable} from '../type-variable.js';

describe('TypeVariable', () => {
  it(`setting the resolution to itself is a no-op`, () => {
    let a = Type.newVariable(new TypeVariable('x'));
    a.variable.resolution = a;
    assert.isNull(a.variable.resolution);
  });
  it(`allows 2 type variables to resolve to each other`, () => {
    let a = Type.newVariable(new TypeVariable('x'));
    let b = Type.newVariable(new TypeVariable('x'));
    a.variable.resolution = b;
    b.variable.resolution = a;

    assert.strictEqual(a.resolvedType(), b.resolvedType());
  });
  it(`allows the resolution to be a collection of other type variable`, () => {
    let a = Type.newVariable(new TypeVariable('x'));
    let b = Type.newVariable(new TypeVariable('x'));
    a.variable.resolution = b.collectionOf();
  });
  it(`disallows the resolution to be a collection of itself`, () => {
    let a = Type.newVariable(new TypeVariable('x'));
    assert.throws(() => a.variable.resolution = a.collectionOf(),
        'variable cannot resolve to collection of itself');
  });
  it(`disallows the resolution of x to be a collection of type variable that resolve to x`, () => {
    let a = Type.newVariable(new TypeVariable('x'));
    let b = Type.newVariable(new TypeVariable('x'));

    b.variable.resolution = a;
    assert.throws(() => a.variable.resolution = b.collectionOf(),
        'variable cannot resolve to collection of itself');
  });
  it(`disallows the resolution of x to be a type variable that resolves to collection of x`, () => {
    let a = Type.newVariable(new TypeVariable('x'));
    let b = Type.newVariable(new TypeVariable('x'));

    b.variable.resolution = a.collectionOf();
    assert.throws(() => a.variable.resolution = b,
        'variable cannot resolve to collection of itself');
  });
  it(`maybeEnsureResolved clears canReadSubset and canWriteSuperset`, () => {
    let a = new TypeVariable('x');
    let b = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));

    a.maybeMergeCanWriteSuperset(b);

    assert.equal(a.canWriteSuperset, b);
    assert.notExists(a.canReadSubset);
    assert.notExists(a.resolution);

    a.maybeEnsureResolved();

    assert.notExists(a.canWriteSuperset);
    assert.notExists(a.canReadSubset);
    assert.equal(a.resolution, b);
  });
});
