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
import {Loader} from '../../platform/loader.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {Schema} from '../schema.js';
import {EntityType} from '../type.js';
import {Entity} from '../entity.js';
import {ArcId} from '../id.js';
import {collectionHandleForTest} from '../testing/handle-for-test.js';

describe('entity', () => {
  it('can be created, stored, and restored', async () => {
    const schema = new Schema(['TestSchema'], {value: 'Text'});

    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: ArcId.newForTest('test'), context: null, loader: new Loader()});
    const entity = new (Entity.createEntityClass(schema, null))({value: 'hello world'});
    assert.isDefined(entity);

    const collectionType = new EntityType(schema).collectionOf();

    const storage = await arc.createStore(collectionType);
    const handle = await collectionHandleForTest(arc, storage);
    await handle.add(entity);

    const collection = await collectionHandleForTest(arc, arc.findStoresByType(collectionType)[0]);
    const list = await collection.toList();
    const clone = list[0];
    assert.isDefined(clone);
    assert.deepEqual(clone, {value: 'hello world'});

    // TODO(https://github.com/PolymerLabs/arcs/pull/2916#discussion_r277793505)
    // Test that clone/entity are not deeply equal.  Revisit once we
    // provide the full storage stack to the shell
  });
});
