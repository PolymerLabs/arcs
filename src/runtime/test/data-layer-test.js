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
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {Schema} from '../schema.js';
import {EntityType} from '../type.js';
import {handleFor} from '../handle.js';

describe('entity', async function() {
  it('can be created, stored, and restored', async () => {
    const schema = new Schema(['TestSchema'], {value: 'Text'});

    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test'});
    const entity = new (schema.entityClass())({value: 'hello world'});
    assert.isDefined(entity);
    const storage = await arc.createStore(new EntityType(schema).collectionOf());
    const handle = handleFor(storage);
    await handle.store(entity);

    const list = await arc.findStoresByType(entity.constructor.type.collectionOf())[0].toList();
    const clone = list[0];
    assert.isDefined(clone);
    assert.deepEqual(clone.rawData, {value: 'hello world'});
    assert.notEqual(entity, clone);
  });
});

describe.skip('relation', function() {
  it('can be created, stored, and restored', function() {
    let Relation;
    let BasicEntity;
    const arc = new Arc({});
    const relation = new Relation(new BasicEntity('thing1'), new BasicEntity('thing2'));
    assert.isDefined(relation);
    arc.commit([relation]);
    const clone = arc.findStoresByType(relation.constructor.type.collectionOf())[0].toList()[0];
    assert.isDefined(clone);
    assert.equal(clone.entities[0].data, 'thing1');
    assert.notEqual(relation, clone);
  });
});
