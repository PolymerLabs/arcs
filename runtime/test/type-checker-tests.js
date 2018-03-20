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
  it('resolves a trio of [~a], [~a], [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('a')).setViewOf();
    let c = Type.newEntity(new Schema({name: 'Product', fields: []})).setViewOf();
    let result = TypeChecker.processTypeList([{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    console.log(result);
  });

  it('resolves a trio of in [Thing], in [Thing], out [Product]', async () => {
    let a = Type.newEntity(new Schema({name: 'Thing', fields: []})).setViewOf();
    let b = Type.newEntity(new Schema({name: 'Thing', fields: []})).setViewOf();
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList([{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    console.log(result);
  });

  it('resolves a trio of in [~a] (is Thing), in [~a] (is Thing), out [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let b = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    a.primitiveType().variable.resolution = resolution;
    b.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList([{type: a, direction: 'in'}, {type: b, direction: 'in'}, {type: c, direction: 'out'}]);
    console.log(result);
  });

  it('resolves a pair of in [~a] (is Thing), out [Product]', async () => {
    let a = Type.newVariable(new TypeVariable('a')).setViewOf();
    let resolution = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    a.primitiveType().variable.resolution = resolution;
    let c = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []})).setViewOf();
    let result = TypeChecker.processTypeList([{type: a, direction: 'in'}, {type: c, direction: 'out'}]);
    console.log(result);
  });

  it('resolves [~a] (is Thing), [~a] (is Thing), [Product], [~a], [~a] (is Product)', async () => {
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
    let result = TypeChecker.processTypeList([{type: a, direction: 'inout'}, {type: b, direction: 'in'}, {type: c, direction: 'in'}, {type: d, direction: 'in'}, {type: e, direction: 'in'}]);
    console.log(result);
  });

  it('doesn\'t depend on ordering in assigning a resolution to a type variable', async () => {
    let a = Type.newVariable(new TypeVariable('a'));
    let b = Type.newEntity(new Schema({name: 'Product', parents: [{name: 'Thing', fields: []}], fields: []}));
    let c = Type.newEntity(new Schema({name: 'Thing', fields: []}));
    let result = TypeChecker.processTypeList([{type: a, direction: 'in'}, {type: b, direction: 'out'}, {type: c, direction: 'in'}]);
    console.log(result, a.variable.resolution);

    a = Type.newVariable(new TypeVariable('a'));    
    result = TypeChecker.processTypeList([{type: a, direction: 'in'}, {type: c, direction: 'in'}, {type: b, direction: 'out'}]);
    console.log(result, a.variable.resolution);

  });

});