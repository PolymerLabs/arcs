/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProviderFactory} from '../storage/storage-provider-factory.js';
import {Arc} from '../arc.js';
import {Manifest} from '../manifest.js';
import {Type} from '../type.js';
import {assert} from '../../platform/assert-web.js';

describe('firebase', function() {
  it('can host a variable', async () => {
    let manifest = await Manifest.parse(`
      schema Bar
        Text value
    `);
    let arc = new Arc({id: 'test'});
    let storage = new StorageProviderFactory(arc.id);
    let BarType = Type.newEntity(manifest.schemas.Bar);
    let value = 'Hi there' + Math.random();
    let variable = await storage.connect('test0', BarType, 
      'firebase://test-firebase-45a3e.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/test');
    await variable.set({id: 'test0:test', value});
    let result = await variable.get();
    assert(value == result.value);
  });

  it('can host a collection', async () => {
    let manifest = await Manifest.parse(`
      schema Bar
        Text value
    `);
    let arc = new Arc({id: 'test'});
    let storage = new StorageProviderFactory(arc.id);
    let BarType = Type.newEntity(manifest.schemas.Bar);
    let value1 = 'Hi there' + Math.random();
    let value2 = 'Goodbye' + Math.random();
    let collection = await storage.connect('test1', BarType.collectionOf(), 
      'firebase://test-firebase-45a3e.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/collection/test');
    await collection.store({id: 'test0:test0', value: value1});
    await collection.store({id: 'test0:test1', value: value2});
    let result = await collection.get('test0:test0');
    assert(value1 == result.value);
    result = await collection.toList();
    assert(result.length == 2);
    assert(result[0].value = value1);
    assert(result[0].id = 'test0:test0');
    assert(result[1].value = value2);
    assert(result[1].id = 'test1:test1');
  }).timeout(10000);
});
