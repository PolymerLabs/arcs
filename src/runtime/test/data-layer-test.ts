/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {handleFor, Collection} from '../handle.js';
import {Loader} from '../loader.js';
import {Schema} from '../schema.js';
import {CollectionStorageProvider} from '../storage/storage-provider-base.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {EntityType} from '../type.js';
import {ArcId, IdGenerator} from '../id.js';

describe('entity', async () => {
  it('can be created, stored, and restored', async () => {
    const schema = new Schema(['TestSchema'], {value: 'Text'});

    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: ArcId.newForTest('test'), context: null, loader: new Loader()});
    const entity = new (schema.entityClass())({value: 'hello world'});
    assert.isDefined(entity);

    const collectionType = new EntityType(schema).collectionOf();
    
    const storage = await arc.createStore(collectionType);
    const handle = handleFor(storage, IdGenerator.newSession()) as Collection;
    await handle.store(entity);

    const collection = arc.findStoresByType(collectionType)[0] as CollectionStorageProvider;
    const list = await collection.toList();
    const clone = list[0];
    assert.isDefined(clone);
    assert.deepEqual(clone.rawData, {value: 'hello world'});
    assert.notEqual(entity, clone);
  });
});
