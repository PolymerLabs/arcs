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
import {Manifest} from '../manifest.js';
import {SlotComposer} from '../slot-composer.js';
import {EntityType, Schema} from '../../types/lib-types.js';
import {Entity} from '../entity.js';
import {ArcId} from '../id.js';
import {handleForStore} from '../storage/storage.js';
import {isCollectionEntityStore, entityHasName} from '../storage/abstract-store.js';
import {Runtime} from '../runtime.js';

describe('entity', () => {
  it('can be created, stored, and restored', async () => {
    const schema = new Schema(['TestSchema'], {value: 'Text'});
    const runtime = new Runtime({context: new Manifest({id: ArcId.newForTest('test')}), loader: new Loader()});
    const arc = runtime.newArc('test');
    const entity = new (Entity.createEntityClass(schema, null))({value: 'hello world'});
    assert.isDefined(entity);

    const collectionType = new EntityType(schema).collectionOf();

    const storage = await arc.createStore(collectionType);
    const handle = await handleForStore(storage, arc);
    await handle.add(entity);

    const store = arc._stores.filter(isCollectionEntityStore).find(entityHasName('TestSchema'));
    const collection = await handleForStore(store, arc);
    const list = await collection.toList();
    const clone = list[0];
    assert.isDefined(clone);
    assert.deepEqual(clone as {}, {value: 'hello world'});

    // TODO(https://github.com/PolymerLabs/arcs/pull/2916#discussion_r277793505)
    // Test that clone/entity are not deeply equal.  Revisit once we
    // provide the full storage stack to the shell
  });
});
