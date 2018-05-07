/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

import {assert} from './chai-web.js';

import {Schema} from '../schema.js';
import Type from '../type.js';
import TypeChecker from '../recipe/type-checker.js';
import {TypeVariable} from '../type-variable.js';
import {Manifest} from '../manifest.js';
import Handle from '../recipe/handle.js';


describe('TypeChecker', () => {
  it('resolves a trio of in [~a], out [~b], in [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('b')).setViewOf();
    let c = Type.newEntity(new Schema({names: ['Product'], fields: {}})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.resolvedType().primitiveType().canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.resolvedType().primitiveType().canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Product');
  });

  it('resolves a trio of in [Thing], in [Thing], out [Product]', async () => {
    let a = Type.newEntity(new Schema({names: ['Thing'], fields: {}})).setViewOf();
    let b = Type.newEntity(new Schema({names: ['Thing'], fields: {}})).setViewOf();
    let c = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of out [Product], in [Thing], in [Thing]', async () => {
    let a = Type.newEntity(new Schema({names: ['Thing'], fields: {}})).setViewOf();
    let b = Type.newEntity(new Schema({names: ['Thing'], fields: {}})).setViewOf();
    let c = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in [~a] (is Thing), in [~b] (is Thing), out [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('b')).setViewOf();
    let resolution = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    a.primitiveType().variable.resolution = resolution;
    b.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a pair of in [~a] (is Thing), out [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    a.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.include(result.primitiveType().canReadSubset.entitySchema.names, 'Thing');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('doesn\'t resolve a pair of out [~a (is Thing)], in [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    a.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(result, null);
  });

  it('doesn\'t resolve a pair of out [~a (is Thing)], inout [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    a.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
    assert.equal(result, null);
  });

  it('resolves inout [~a] (is Thing), in [~b] (is Thing), in [Product], in [~c], in [~d] (is Product)', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('b')).setViewOf();
    let resolution = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    a.primitiveType().variable.resolution = resolution;
    b.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf();
    let d = Type.newVariable(new TypeVariable('c')).setViewOf();
    let e = Type.newVariable(new TypeVariable('d')).setViewOf();
    resolution = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}}));
    e.primitiveType().variable.resolution = resolution;
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    assert.equal(result, null);
  });

  it('doesn\'t depend on ordering in assigning a resolution to a type variable', async () => {
    let a = Type.newVariable(new TypeVariable('a'));
    let b = Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}}));
    let c = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');

    a = Type.newVariable(new TypeVariable('a'));
    result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'in'}, {type: b, direction: 'out'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('correctly applies then resolves a one-sided Entity constraint', async () => {
    let manifest = await Manifest.parse(`
      shape Shape
        Shape(in ~a item)

      particle Concrete
        in Product {} item

      particle Transformation
        host Shape particle
        in [~a] collection

      recipe
        create as h0
        Transformation
          particle <- Concrete
          collection <- h0
    `);

    let recipe = manifest.recipes[0];
    let type = Handle.effectiveType(null, recipe.handles[0].connections);
    assert.equal(false, type.isResolved());
    assert.equal(true, type.canEnsureResolved());
    assert.equal(true, type.maybeEnsureResolved());
    assert.equal(true, type.isResolved());
    assert.equal('Product', type.resolvedType().primitiveType().entitySchema.names[0]);

    recipe.normalize();
    assert.equal(true, recipe.isResolved());

  });

  it('does not resolve Entity and SetView', async () => {
    let entity = {
      type: Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})),
      direction: 'inout'
    };
    let setView = {
      type: Type.newEntity(new Schema({names: ['Product', 'Thing'], fields: {}})).setViewOf(),
      direction: 'inout'
    };

    assert.isNull(TypeChecker.processTypeList(entity.type, [setView]));
    assert.isNull(TypeChecker.processTypeList(setView.type, [entity]));
    assert.isNull(TypeChecker.processTypeList(undefined, [entity, setView]));
    assert.isNull(TypeChecker.processTypeList(undefined, [setView, entity]));
  });
});
