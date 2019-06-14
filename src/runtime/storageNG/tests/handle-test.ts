/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {CRDTCollection, CRDTCollectionTypeRecord} from '../../crdt/crdt-collection';
import {CRDTSingleton, CRDTSingletonTypeRecord} from '../../crdt/crdt-singleton';
import {CollectionHandle, SingletonHandle} from '../handle';
import {StorageProxy} from '../storage-proxy';
import {MockStore} from './storage-proxy-test';

function getCollectionHandle(): CollectionHandle<string> {
  // tslint:disable-next-line: no-any
  const fakeParticle: any = {};
  return new CollectionHandle<string>(
      'me',
      new StorageProxy(
          new CRDTCollection<string>(),
          new MockStore<CRDTCollectionTypeRecord<string>>()),
      fakeParticle);
}

function getSingletonHandle(): SingletonHandle<string> {
  // tslint:disable-next-line: no-any
  const fakeParticle: any = {};
  return new SingletonHandle<string>(
      'me',
      new StorageProxy(
          new CRDTSingleton<string>(),
          new MockStore<CRDTSingletonTypeRecord<string>>()),
      fakeParticle);
}

describe('CollectionHandle', () => {
  it('can add and remove elements', async () => {
    const handle = getCollectionHandle();
    assert.isEmpty(handle.toList());
    await handle.add('A');
    assert.sameMembers(await handle.toList(), ['A']);
    await handle.add('B');
    assert.sameMembers(await handle.toList(), ['A', 'B']);
    await handle.remove('A');
    assert.sameMembers(await handle.toList(), ['B']);
  });

  it('can clear', async () => {
    const handle = getCollectionHandle();
    await handle.add('A');
    await handle.add('B');
    await handle.clear();
    assert.isEmpty(handle.toList());
  });

  it('can add multiple entities', async () => {
    const handle = getCollectionHandle();
    await handle.addMultiple(['A', 'B']);
    assert.sameMembers(await handle.toList(), ['A', 'B']);
  });
});

describe('SingletonHandle', () => {
  it('can set and clear elements', async () => {
    const handle = getSingletonHandle();
    assert.equal(await handle.get(), null);
    await handle.set('A');
    assert.equal(await handle.get(), 'A');
    await handle.set('B');
    assert.equal(await handle.get(), 'B');
    await handle.clear();
    assert.equal(await handle.get(), null);
  });
});
