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

import Schema from '../schema.js';
import Type from '../type.js';
import TypeChecker from '../recipe/type-checker.js';
import TypeVariable from '../type-variable.js';


describe('TypeChecker', () => {
  it('resolves a trio of in [~a], out [~a], in [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('a')).setViewOf();
    let c = Type.newEntity(new Schema({name: 'Product', fields: []})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.resolvedType().primitiveType().canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.resolvedType().primitiveType().canWriteSuperset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Product');
  });

  it('resolves a trio of in [Thing], in [Thing], out [Product]', async () => {
    let a = Type.newEntity(new Schema({name: 'Thing', fields: []})).setViewOf();
    let b = Type.newEntity(new Schema({name: 'Thing', fields: []})).setViewOf();
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of out [Product], in [Thing], in [Thing]', async () => {
    let a = Type.newEntity(new Schema({name: 'Thing', fields: []})).setViewOf();
    let b = Type.newEntity(new Schema({name: 'Thing', fields: []})).setViewOf();
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: c, direction: 'out'}, {type: a, direction: 'in'}, {type: b, direction: 'in'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a trio of in [~a] (is Thing), in [~a] (is Thing), out [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    a.primitiveType().variable.resolution = resolution;
    b.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('resolves a pair of in [~a] (is Thing), out [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    a.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
    assert.equal(result.primitiveType().canReadSubset.entitySchema.name, 'Product');
    assert.equal(result.primitiveType().canReadSubset.entitySchema.parents[0].name, 'Thing');
    assert.equal(result.primitiveType().canWriteSuperset.entitySchema.name, 'Thing');
  });

  it('doesn\'t resolve a pair of out [~a (is Thing)], in [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    a.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(result, null);
  });
  
  it('doesn\'t resolve a pair of out [~a (is Thing)], inout [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    a.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'out'}, {type: c, direction: 'inout'}]);
    assert.equal(result, null);
  });

  it('resolves inout [~a] (is Thing), in [~a] (is Thing), in [Product], in [~a], in [~a] (is Product)', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    a.primitiveType().variable.resolution = resolution;
    b.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let d = Type.newVariable(new TypeVariable('a')).setViewOf();
    let e = Type.newVariable(new TypeVariable('a')).setViewOf();
    resolution = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []}));
    e.primitiveType().variable.resolution = resolution;
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    assert.equal(result, null);
  });

  it('doesn\'t depend on ordering in assigning a resolution to a type variable', async () => {
    let a = Type.newVariable(new TypeVariable('a'));
    let b = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []}));
    let c = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    let result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');

    a = Type.newVariable(new TypeVariable('a'));    
    result = TypeChecker.processTypeList(undefined, [{type: a, direction: 'in'}, {type: c, direction: 'in'}, {type: b, direction: 'out'}]);
    assert.equal(a.variable.canReadSubset.entitySchema.name, 'Product');
    assert.equal(a.variable.canWriteSuperset.entitySchema.name, 'Thing');
  });

});