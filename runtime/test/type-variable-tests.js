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
import {TypeVariable} from '../ts-build/type-variable.js';

const resolutionAssertMsg = 'variable cannot resolve to collection of itself';

describe('TypeVariable', () => {
  it(`setting the resolution to itself is a no-op`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    a.variable.resolution = a;
    assert.isNull(a.variable.resolution);
  });

  it(`allows 2 type variables to resolve to each other`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    const b = Type.newVariable(new TypeVariable('x'));
    a.variable.resolution = b;
    b.variable.resolution = a;

    assert.strictEqual(a.resolvedType(), b.resolvedType());
  });

  it(`allows the resolution to be a Collection of other type variable`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    const b = Type.newVariable(new TypeVariable('x'));
    a.variable.resolution = b.collectionOf();
  });

  it(`allows the resolution to be a BigCollection of other type variable`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    const b = Type.newVariable(new TypeVariable('x'));
    a.variable.resolution = b.bigCollectionOf();
  });

  it(`disallows the resolution to be a Collection of itself`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    assert.throws(() => a.variable.resolution = a.collectionOf(), resolutionAssertMsg);
  });

  it(`disallows the resolution to be a BigCollection of itself`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    assert.throws(() => a.variable.resolution = a.bigCollectionOf(), resolutionAssertMsg);
  });

  it(`disallows the resolution of x to be a Collection of type variable that resolve to x`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    const b = Type.newVariable(new TypeVariable('x'));
    b.variable.resolution = a;
    assert.throws(() => a.variable.resolution = b.collectionOf(), resolutionAssertMsg);
  });

  it(`disallows the resolution of x to be a BigCollection of type variable that resolve to x`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    const b = Type.newVariable(new TypeVariable('x'));
    b.variable.resolution = a;
    assert.throws(() => a.variable.resolution = b.bigCollectionOf(), resolutionAssertMsg);
  });

  it(`disallows the resolution of x to be a type variable that resolves to Collection of x`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    const b = Type.newVariable(new TypeVariable('x'));
    b.variable.resolution = a.collectionOf();
    assert.throws(() => a.variable.resolution = b, resolutionAssertMsg);
  });

  it(`disallows the resolution of x to be a type variable that resolves to BigCollection of x`, () => {
    const a = Type.newVariable(new TypeVariable('x'));
    const b = Type.newVariable(new TypeVariable('x'));
    b.variable.resolution = a.bigCollectionOf();
    assert.throws(() => a.variable.resolution = b, resolutionAssertMsg);
  });

  it(`maybeEnsureResolved clears canReadSubset and canWriteSuperset`, () => {
    const a = new TypeVariable('x');
    const b = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));

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
