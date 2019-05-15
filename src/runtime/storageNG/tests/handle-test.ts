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
import { CollectionHandle } from '../handle';
import { StorageProxy } from '../storage-proxy';
import { CRDTCollection } from '../../crdt/crdt-collection';

describe('handleNG', () => {
  it('can add and remove elements', () => {
    const handle = new CollectionHandle<string>("me", new StorageProxy(new CRDTCollection<string>()));
    assert.isEmpty(handle.toList());
    handle.add("A");
    assert.sameMembers(handle.toList(), ["A"]);
    handle.add("B");
    assert.sameMembers(handle.toList(), ["A", "B"]);
    handle.remove("A");
    assert.sameMembers(handle.toList(), ["B"]);
  });

  it('can clear', () => {
    const handle = new CollectionHandle<string>("me", new StorageProxy(new CRDTCollection<string>()));    
    handle.add("A");
    handle.add("B");
    handle.clear();
    assert.isEmpty(handle.toList());    
  });

  it('can add multiple entities', () => {
    const handle = new CollectionHandle<string>("me", new StorageProxy(new CRDTCollection<string>()));
    handle.addMultiple(["A","B"]);
    assert.sameMembers(handle.toList(), ["A", "B"]);
  });
});