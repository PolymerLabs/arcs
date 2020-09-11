/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Referenceable, CRDTEntity, EntityOpTypes, CRDTSingleton, CRDTCollection, CRDTType} from '../lib-crdt.js';

describe('CRDTEntity', () => {
  it('has reasonable defaults for singletons and sets', () => {
    const singletons = {
      name: new CRDTSingleton<{id: string, value: string}>()
    };
    const collections = {
      tags: new CRDTCollection<{id: string, value: string}>()
    };
    const entity = new CRDTEntity(singletons, collections);

    assert.deepEqual(entity.getParticleView(),
    {
      singletons: {name: null},
      collections: {tags: new Set<{id: string, value: string}>()}
    });
  });

  it('can apply a set operation to a singleton field', () => {
    const singletons = {
      name: new CRDTSingleton<{id: string, value: string}>()
    };
    const collections = {
      tags: new CRDTCollection<{id: string, value: string}>()
    };
    const entity = new CRDTEntity(singletons, collections);

    const value = {id: 'bob', value: 'bob'};
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'name', value, actor: 'me', clock: {'me': 1}}));
    assert.deepEqual(entity.getParticleView(),
      {singletons: {name: value}, collections: {tags: new Set<Referenceable>()}});
  });

  it('can apply a clear operation to a singleton field', () => {
    const singletons = {
      name: new CRDTSingleton<{id: string, value: string}>()
    };
    const collections = {
      tags: new CRDTCollection<{id: string, value: string}>()
    };
    const entity = new CRDTEntity(singletons, collections);

    const value = {id: 'bob', value: 'bob'};
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'name', value, actor: 'me', clock: {'me': 1}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Clear, field: 'name', actor: 'me', clock: {'me': 1}}));
    assert.deepEqual(entity.getParticleView(), {singletons: {name: null}, collections: {tags: new Set<{id: string, value: string}>()}});
  });

  it('can apply an add operation to a collection field', () => {
    const singletons = {
      name: new CRDTSingleton<{id: string, value: string}>()
    };
    const collections = {
      tags: new CRDTCollection<{id: string, value: string}>()
    };
    const entity = new CRDTEntity(singletons, collections);

    const value = {id: 'bob', value: 'bob'};
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Add, field: 'tags', added: value, actor: 'me', clock: {'me': 1}}));
    assert.deepEqual(entity.getParticleView(), {singletons: {name: null}, collections: {tags: new Set<{id: string, value: string}>([value])}});
  });

  it('can apply a remove operation to a collection field', () => {
    const singletons = {
      name: new CRDTSingleton<{id: string, value: string}>()
    };
    const collections = {
      tags: new CRDTCollection<{id: string, value: string}>()
    };
    const entity = new CRDTEntity(singletons, collections);

    const value = {id: 'bob', value: 'bob'};
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Add, field: 'tags', added: value, actor: 'me', clock: {'me': 1}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Remove, field: 'tags', removed: value, actor: 'me', clock: {'me': 1}}));
    assert.deepEqual(entity.getParticleView(), {singletons: {name: null}, collections: {tags: new Set<{id: string, value: string}>()}});
  });

  it('can apply operations to multiple fields', () => {
    const singletons = {
      name: new CRDTSingleton<{id: string, value: string}>(),
      age: new CRDTSingleton<{id: string, value: number}>()
    };
    const collections = {
      tags: new CRDTCollection<{id: string, value: string}>(),
      favoriteNumbers: new CRDTCollection<{id: string, value: number}>()
    };
    const entity = new CRDTEntity(singletons, collections);

    const name = {id: 'bob', value: 'bob'};
    const age = {id: '42', value: 42};

    const tag = {id: '#perf', value: '#perf'};
    const favoriteNumber = {id: '4', value: 4};

    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'name', value: name, actor: 'me', clock: {'me': 1}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'age', value: age, actor: 'me', clock: {'me': 1}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Add, field: 'tags', added: tag, actor: 'me', clock: {'me': 1}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Add, field: 'favoriteNumbers', added: favoriteNumber, actor: 'me', clock: {'me': 1}}));
    assert.deepEqual(entity.getParticleView(), {
      singletons: {name, age},
      collections: {tags: new Set([tag]), favoriteNumbers: new Set([favoriteNumber])}
    });
  });

  it('keeps separate clocks for separate fields', () => {
    const singletons = {
      name: new CRDTSingleton<{id: string, value: string}>(),
      age: new CRDTSingleton<{id: string, value: number}>()
    };
    const entity = new CRDTEntity(singletons, {});

    const name1 = {id: 'bob', value: 'bob'};
    const name2 = {id: 'dave', value: 'dave'};
    const age1 = {id: '42', value: 42};
    const age2 = {id: '37', value: 37};

    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'name', value: name1, actor: 'me', clock: {'me': 1}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'age', value: age1, actor: 'me', clock: {'me': 1}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'name', value: name2, actor: 'me', clock: {'me': 2}}));
    assert.isTrue(entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'age', value: age2, actor: 'them', clock: {'me': 1, 'them': 1}}));
  });

  it('fails when an invalid field name is provided', () => {
    const entity = new CRDTEntity({}, {});

    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'invalid', value: {id: 'foo'}, actor: 'me', clock: {'me': 1}}), 'Invalid field');
    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Clear, field: 'invalid', actor: 'me', clock: {'me': 1}}), 'Invalid field');
    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Add, field: 'invalid', added: {id: 'foo'}, actor: 'me', clock: {'me': 1}}), 'Invalid field');
    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Remove, field: 'invalid', removed: {id: 'foo'}, actor: 'me', clock: {'me': 1}}), 'Invalid field');
  });

  it('fails when singleton operations are provided to collection fields', () => {
    const entity = new CRDTEntity({}, {things: new CRDTCollection<{id: string}>()});

    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Set, field: 'things', value: {id: 'foo'}, actor: 'me', clock: {'me': 1}}),
      `Can't apply Set operation to collection field`);
    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Clear, field: 'things', actor: 'me', clock: {'me': 1}}),
      `Can't apply Clear operation to collection field`);
  });

  it('fails when collection operations are provided to singleton fields', () => {
    const entity = new CRDTEntity({thing: new CRDTSingleton<{id: string}>()}, {});

    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Add, field: 'thing', added: {id: 'foo'}, actor: 'me', clock: {'me': 1}}),
      `Can't apply Add operation to singleton field`);
    assert.throws(() => entity.applyOperation({crdtType: CRDTType.Entity, type: EntityOpTypes.Remove, field: 'thing', removed: {id: 'foo'}, actor: 'me', clock: {'me': 1}}),
      `Can't apply Remove operation to singleton field`);
  });
});
