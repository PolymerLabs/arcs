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
import {ConCap} from '../../testing/test-util.js';
import {Ttl} from '../recipe/ttl.js';

describe('Entity', () => {

  let schema: Schema;
  let entityClass: EntityClass;
  before(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        txt: Text
        lnk: URL
        num: Number
        flg: Boolean
        buf: Bytes
        ref: &{z: Text}
        tuple: (Text, URL, Number, Boolean, Bytes)
        union: (Text or URL or Number or Boolean or Bytes)
        kt: Long
        lst: List<Number>
    `);
    schema = manifest.findSchemaByName('Foo');
    entityClass = Entity.createEntityClass(schema, null);
  });

  it('behaves like a regular object except writing to any field fails', () => {
    const e = new entityClass({txt: 'abc', num: 56, lst: [1, 2, 5, 4, 3]});

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
    assert.throws(() => {e['lst'] = []; }, `Tried to modify entity field 'lst'`);

    assert.strictEqual(JSON.stringify(e), '{"txt":"abc","num":56,"lst":[1,2,5,4,3]}');
    assert.strictEqual(e.toString(), 'Foo { txt: "abc", num: 56, lst: [1,2,5,4,3] }');
    assert.strictEqual(`${e}`, 'Foo { txt: "abc", num: 56, lst: [1,2,5,4,3] }');

    assert.deepEqual(Object.entries(e), [['txt', 'abc'], ['num', 56], ['lst', [1, 2, 5, 4, 3]]]);
    assert.deepEqual(Object.keys(e), ['txt', 'num', 'lst']);
    assert.deepEqual(Object.values(e), ['abc', 56, [1, 2, 5, 4, 3]]);
  });

  it('static Entity API maps onto EntityInternals methods', () => {
    // Mutation APIs are tested below.
    const e = new entityClass({txt: 'abc', num: 56});
    assert.isFalse(Entity.isIdentified(e));
    const now = new Date().getTime();
    Entity.identify(e, 'id1', null, now);
    assert.isTrue(Entity.isIdentified(e));
    assert.strictEqual(Entity.id(e), 'id1');
    assert.strictEqual(Entity.creationTimestamp(e).getTime(), now);

    const e2 = new entityClass({txt: 'abc'});
    assert.isFalse(Entity.isIdentified(e2));
    Entity.createIdentity(e2, Id.fromString('id2'), IdGenerator.createWithSessionIdForTesting('s'), null, Ttl.infinite);
    assert.isTrue(Entity.isIdentified(e2));
    assert.strictEqual(Entity.id(e2), '!s:id2:0');

    assert.deepEqual(Entity.dataClone(e), {txt: 'abc', num: 56});
    assert.deepEqual(Entity.serialize(e), {id: 'id1', creationTimestamp: now, rawData: {txt: 'abc', num: 56}});
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
        id: Text
        mutable: Boolean
        // static fields
        schema: URL
        type: Number
        // internal methods (exposed via Entity static methods)
        toLiteral: Number
        makeImmutable: Text
    `);
    const schema = manifest.schemas.Shadow;
    const entityClass = Entity.createEntityClass(schema, null);
    const data = {id: 'schema-id', mutable: false, schema: 'url', type: 81, toLiteral: 23, makeImmutable: 'make'};
    const e = new entityClass(data);
    Entity.identify(e, 'arcs-id', null);

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
    const e = new entityClass({
      txt: 'abc',
      lnk: 'http://wut',
      num: 3.7,
      flg: true,
      buf: new Uint8Array([2]),
      tuple: ['def', '404', 0, true, new Uint8Array()],
      union: 'str',
    });
    Entity.identify(e, '!test:uid:u0', null);
    const fields = JSON.stringify(e);
    const internals = JSON.stringify(e[SYMBOL_INTERNALS]);

    // debugLog uses a single call to console.dir with the entity copy as the first argument.
    const cc = ConCap.capture(() => Entity.debugLog(e));
    const dirArg = cc.dir[0][0];

    // The dir'd object should be an Entity with an Internals object, both different from the original.
    assert.instanceOf(dirArg, Entity);
    assert.isDefined(dirArg[SYMBOL_INTERNALS]);
    assert.notStrictEqual(dirArg, e);
    assert.notStrictEqual(dirArg[SYMBOL_INTERNALS], e[SYMBOL_INTERNALS]);

    // Spot check a couple of fields.
    assert.strictEqual(dirArg.txt, 'abc');
    assert.strictEqual(dirArg.num, 3.7);

    // The original entity should not have been modified.
    assert.strictEqual(JSON.stringify(e), fields);
    assert.strictEqual(JSON.stringify(e[SYMBOL_INTERNALS]), internals);
  });

  it('is mutable by default', () => {
    const e = new entityClass({txt: 'abc'});
    assert.isTrue(Entity.isMutable(e));
    assert.strictEqual(e.txt, 'abc');
  });

  it('allows mutations via the mutate method with a callback function', () => {
    const e = new entityClass({txt: 'abc', num: 56, lst: [1, 2, 5, 4, 3]});
    Entity.mutate(e, e => e.txt = 'xyz');
    assert.strictEqual(e.txt, 'xyz');
    assert.strictEqual(e.num, 56);
    assert.deepEqual(e.lst, [1, 2, 5, 4, 3]);
    Entity.mutate(e, e => e.lst = []);
    assert.strictEqual(e.num, 56);
    assert.deepEqual(e.lst, []);
  });

  it('allows mutations via the mutate method with new data', () => {
    const e = new entityClass({txt: 'abc', num: 56});
    Entity.mutate(e, {num: 35, lst: [1, 2, 3]});
    assert.strictEqual(e.txt, 'abc');
    assert.strictEqual(e.num, 35);
    assert.deepEqual(e.lst, [1, 2, 3]);
  });

  it('prevents mutating a list if contained values are not of the appropriate type', () => {
    const e = new entityClass({});
    assert.throws(() => Entity.mutate(e, {lst: ['foo']}), `Type mismatch setting field lst`);
    assert.throws(() => Entity.mutate(e, {lst: [1, 2, 'foo']}), `Type mismatch setting field lst`);
  });

  it('prevents mutations of Kotlin types', () => {
    const e = new entityClass({txt: 'abc', num: 56});
    assert.throws(() => Entity.mutate(e, {kt: 300}), `Kotlin primitive values can't yet be used`);
  });

  it('prevents construction that sets Kotlin types', () => {
    assert.throws(() => new entityClass({txt: 'abc', num: 56, kt: 42}), `Kotlin primitive values can't yet be used`);
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

  it('dataClone supports all field types and performs deep copies', async () => {
    const creationTimestamp = new Date();
    const expirationTimestamp = new Date(creationTimestamp.getTime() + 1000);
    const storageKey = 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}';
    const e1 = new entityClass({
      txt: 'abc',
      lnk: 'site',
      num: 45.8,
      flg: true,
      buf: new Uint8Array([25, 73]),
      ref: {id: 'i1', entityStorageKey: storageKey, creationTimestamp, expirationTimestamp},
      tuple: ['def', 'link', -12, true, new Uint8Array([5, 7])],
      union: new Uint8Array([80]),
      lst: [1, 2, 5, 4, 3]
    });

    const e2 = new entityClass(Entity.dataClone(e1));
    assert.deepStrictEqual(e1, e2);

    // Object-based fields should *not* refer to the same instances.
    assert.isFalse(e1.buf === e2.buf);
    assert.isFalse(e1.ref === e2.ref);
    assert.isFalse(e1.tuple === e2.tuple);
    assert.isFalse(e1.union === e2.union);
    assert.isFalse(e1.lst === e2.lst);

    // Modify all non-reference object fields on e1 and confirm e2 is not affected.
    e1.buf.fill(9);
    e1.tuple[2] = 20;
    e1.tuple[4].fill(2);
    e1.union.fill(0);
    e1.lst[3] = 6;

    assert.deepStrictEqual(e2.buf, new Uint8Array([25, 73]));
    assert.deepStrictEqual(e2.tuple, ['def', 'link', -12, true, new Uint8Array([5, 7])]);
    assert.deepStrictEqual(e2.union, new Uint8Array([80]));
    assert.deepStrictEqual(e2.lst, [1, 2, 5, 4, 3]);
  });

  // TODO(mmandlis): add tests with TTLs
});
