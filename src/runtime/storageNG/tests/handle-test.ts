/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import { assert } from '../../../platform/chai-web.js';
import {PECInnerPort} from '../../api-channel';
import { CRDTCollection } from '../../crdt/crdt-collection';
import {CRDTSingleton} from '../../crdt/crdt-singleton';
import {Particle} from '../../particle';
import {CollectionHandle, SingletonHandle} from '../handle';
import {StorageProxy} from '../storage-proxy';

function getCollectionHandle(): CollectionHandle<string> {
  // tslint:disable-next-line: no-any
  const fakePec: any = {};
  // tslint:disable-next-line: no-any
  const fakeParticle: any = {};
  return new CollectionHandle<string>(
      'me',
      new StorageProxy(new CRDTCollection<string>(), fakePec),
      fakeParticle);
}

function getSingletonHandle(): SingletonHandle<string> {
  // tslint:disable-next-line: no-any
  const fakePec: any = {};
  // tslint:disable-next-line: no-any
  const fakeParticle: any = {};
  return new SingletonHandle<string>(
      'me',
      new StorageProxy(new CRDTSingleton<string>(), fakePec),
      fakeParticle);
}

describe('CollectionHandle', () => {
  it('can add and remove elements', () => {
    const handle = getCollectionHandle();
    assert.isEmpty(handle.toList());
    handle.add('A');
    assert.sameMembers(handle.toList(), ['A']);
    handle.add('B');
    assert.sameMembers(handle.toList(), ['A', 'B']);
    handle.remove('A');
    assert.sameMembers(handle.toList(), ['B']);
  });

  it('can clear', () => {
    const handle = getCollectionHandle();
    handle.add('A');
    handle.add('B');
    handle.clear();
    assert.isEmpty(handle.toList());
  });

  it('can add multiple entities', () => {
    const handle = getCollectionHandle();
    handle.addMultiple(['A', 'B']);
    assert.sameMembers(handle.toList(), ['A', 'B']);
  });
});

describe('SingletonHandle', () => {
  it('can set and clear elements', () => {
    const handle = getSingletonHandle();
    assert.equal(handle.get(), null);
    handle.set('A');
    assert.equal(handle.get(), 'A');
    handle.set('B');
    assert.equal(handle.get(), 'B');
    handle.clear();
    assert.equal(handle.get(), null);
  });
});
