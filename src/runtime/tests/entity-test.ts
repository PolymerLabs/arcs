/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Entity, EntityClass} from '../entity.js';
import {IdGenerator, Id} from '../id.js';
import {Schema} from '../schema.js';
import {EntityType} from '../type.js';
import {SYMBOL_INTERNALS} from '../symbols.js';

describe('Entity', () => {

  let schema: Schema;
  let entityClass: EntityClass;
  before(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text txt
        Number num
        Boolean flg
    `);
    schema = manifest.schemas.Foo;
    entityClass = schema.entityClass();
  });

  it('behaves like a regular object except writing to any field fails', () => {
    const e = new entityClass({txt: 'abc', num: 56});

    assert.strictEqual(e.txt, 'abc');
    assert.strictEqual(e.num, 56);
    assert.isUndefined(e.flg);
    assert.isUndefined(e.notInTheSchema);

    assert.strictEqual(e['txt'], 'abc');
    assert.strictEqual(e['num'], 56);
    assert.isUndefined(e['flg']);
    assert.isUndefined(e['notInTheSchema']);

    assert.throws(() => { e.num = 3; }, `Tried to modify entity field 'num'`);
    assert.throws(() => { e['num'] = 3; }, `Tried to modify entity field 'num'`);
    assert.throws(() => { e.notInSchema = 3; }, `Tried to modify entity field 'notInSchema'`);

    assert.strictEqual(JSON.stringify(e), '{"txt":"abc","num":56}');
    assert.strictEqual(e.toString(), 'Foo { txt: "abc", num: 56 }');
    assert.strictEqual(`${e}`, 'Foo { txt: "abc", num: 56 }');

    assert.deepEqual(Object.entries(e), [['txt', 'abc'], ['num', 56]]);
    assert.deepEqual(Object.keys(e), ['txt', 'num']);
    assert.deepEqual(Object.values(e), ['abc', 56]);
  });

  it('static Entity API maps onto EntityInternals methods', () => {
    // Mutation APIs are tested below.
    const e = new entityClass({txt: 'abc', num: 56});
    assert.isFalse(Entity.isIdentified(e));
    Entity.identify(e, 'id1');
    assert.isTrue(Entity.isIdentified(e));
    assert.strictEqual(Entity.id(e), 'id1');

    const e2 = new entityClass({txt: 'abc'});
    assert.isFalse(Entity.isIdentified(e2));
    Entity.createIdentity(e2, Id.fromString('id2'), IdGenerator.createWithSessionIdForTesting('s'));
    assert.isTrue(Entity.isIdentified(e2));
    assert.strictEqual(Entity.id(e2), '!s:id2:0');

    assert.deepEqual(Entity.dataClone(e), {txt: 'abc', num: 56});
    assert.deepEqual(Entity.serialize(e), {id: 'id1', rawData: {txt: 'abc', num: 56}});
    assert.strictEqual(Entity.entityClass(e), entityClass);

    // Static methods
    assert.deepEqual(entityClass.type, new EntityType(schema));
    assert.deepEqual(entityClass.key, {tag: 'entity', schema});
    assert.strictEqual(entityClass.schema, schema);
  });

  it('schema fields can use the same names as internal fields and methods', async () => {
    const manifest = await Manifest.parse(`
      schema Shadow
        // internal fields
        Text id
        Boolean mutable
        // static fields
        URL schema
        Number type
        // internal methods (exposed via Entity static methods)
        Number toLiteral
        Text makeImmutable
    `);
    const schema = manifest.schemas.Shadow;
    const entityClass = schema.entityClass();
    const data = {id: 'schema-id', mutable: false, schema: 'url', type: 81, toLiteral: 23, makeImmutable: 'make'};
    const e = new entityClass(data);
    Entity.identify(e, 'arcs-id');

    // Reading the schema fields should match the input data fields.
    assert.strictEqual(e.id, 'schema-id');
    assert.isFalse(e.mutable);
    assert.strictEqual(e.schema, 'url');
    assert.strictEqual(e.type, 81);
    assert.strictEqual(e.toLiteral, 23);
    assert.strictEqual(e.makeImmutable, 'make');

    // Accessing the internals should be unaffected.
    assert.strictEqual(Entity.id(e), 'arcs-id');
    assert.isTrue(Entity.isMutable(e));
    assert.strictEqual(entityClass.schema, schema);
    assert.deepEqual(entityClass.type, new EntityType(schema));
    assert.deepEqual(Entity.toLiteral(e), data);
    Entity.makeImmutable(e);
    assert.isFalse(Entity.isMutable(e));
  });

  it(`Entity.debugLog doesn't affect the original entity`, async () => {
    const manifest = await Manifest.parse(`
      schema EntityDebugLog
        Text txt
        URL lnk
        Number num
        Boolean flg
        Bytes buf
        (Text or Number) union
        (Text, Number) tuple
    `);
    const entityClass = manifest.schemas.EntityDebugLog.entityClass();
    const e = new entityClass({
      txt: 'abc',
      lnk: 'http://wut',
      num: 3.7,
      flg: true,
      buf: new Uint8Array([2]),
      union: 'def',
      tuple: ['ghi', 12]
    });
    Entity.identify(e, '!test:uid:u0');
    const fields = JSON.stringify(e);
    const internals = JSON.stringify(e[SYMBOL_INTERNALS]);
    // Prevent console.dir from spamming the test output
    const saveDir = console.dir;
    console.dir = () => {};
    Entity.debugLog(e);
    console.dir = saveDir;
    assert.strictEqual(JSON.stringify(e), fields);
    assert.strictEqual(JSON.stringify(e[SYMBOL_INTERNALS]), internals);
  });

  it('is mutable by default', () => {
    const e = new entityClass({txt: 'abc'});
    assert.isTrue(Entity.isMutable(e));
    assert.strictEqual(e.txt, 'abc');
  });

  it('allows mutations via the mutate method with a callback function', () => {
    const e = new entityClass({txt: 'abc', num: 56});
    Entity.mutate(e, e => e.txt = 'xyz');
    assert.strictEqual(e.txt, 'xyz');
    assert.strictEqual(e.num, 56);
  });

  it('allows mutations via the mutate method with new data', () => {
    const e = new entityClass({txt: 'abc', num: 56});
    Entity.mutate(e, {num: 35});
    assert.strictEqual(e.txt, 'abc');
    assert.strictEqual(e.num, 35);
  });

  it('forbids mutations via setters', () => {
    const e = new entityClass({txt: 'abc'});
    assert.throws(() => e.txt = 'xyz', `Tried to modify entity field 'txt'`);
    assert.strictEqual(e.txt, 'abc');
  });

  it('rejects mutations when immutable', () => {
    const e = new entityClass({txt: 'abc', num: 56});

    Entity.makeImmutable(e);
    assert.throws(() => {
      Entity.mutate(e, e => e.num = 35);
    }, 'Entity is immutable');

    assert.throws(() => {
      Entity.mutate(e, {txt: 'xyz'});
    }, 'Entity is immutable');

    assert.strictEqual(e.txt, 'abc');
    assert.strictEqual(e.num, 56);
  });
});
