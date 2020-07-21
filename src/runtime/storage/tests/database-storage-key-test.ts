/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {PersistentDatabaseStorageKey, MemoryDatabaseStorageKey} from '../database-storage-key.js';

describe('Database storage key', async () => {
  it(`stringifies persistent storage key`, () => {
    const key = new PersistentDatabaseStorageKey('foo', '1234a', 'myDb');
    assert.equal(key.toString(), 'db://1234a@myDb/foo');
  });

  it(`stringifies non-persistent storage key`, () => {
    const key = new MemoryDatabaseStorageKey('foo', '1234a', 'myDb');
    assert.equal(key.toString(), 'memdb://1234a@myDb/foo');
  });

  it(`parses persistent storage key`, () => {
    const key = PersistentDatabaseStorageKey.fromString('db://1234a@myDb/foo');
    assert.equal(key.unique, 'foo');
    assert.equal(key.entitySchemaHash, '1234a');
    assert.equal(key.dbName, 'myDb');
  });

  it(`parses non-persistent storage key`, () => {
    const key = MemoryDatabaseStorageKey.fromString('memdb://1234a@myDb/foo');
    assert.equal(key.unique, 'foo');
    assert.equal(key.entitySchemaHash, '1234a');
    assert.equal(key.dbName, 'myDb');
  });

  it(`fails when dbName has weird characters`, () => {
    assert.throws(() => {
      const key = new PersistentDatabaseStorageKey('foo', '1234a', 'no spaces');
    });
    assert.throws(() => {
      const key = new MemoryDatabaseStorageKey('foo', '1234a', 'no spaces');
    });
    assert.throws(() => {
      const key = new PersistentDatabaseStorageKey('foo', '1234a', 'no:colons');
    });
    assert.throws(() => {
      const key = new MemoryDatabaseStorageKey('foo', '1234a', 'no:colons');
    });
    assert.throws(() => {
      const key = new PersistentDatabaseStorageKey('foo', '1234a', 'slashes/arent/cool');
    });
    assert.throws(() => {
      const key = new MemoryDatabaseStorageKey('foo', '1234a', 'slashes/arent/cool');
    });
    assert.throws(() => {
      const key = new PersistentDatabaseStorageKey('foo', '1234a', 'periods.shouldnt.be.allowed');
    });
    assert.throws(() => {
      const key = new MemoryDatabaseStorageKey('foo', '1234a', 'periods.shouldnt.be.allowed');
    });
  });

  it(`requires dbName to start with alphabetical character`, () => {
    const legalStarters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const ch of legalStarters) {
      const pkey = new PersistentDatabaseStorageKey('foo', '1234a', `${ch}`);
      const mkey = new MemoryDatabaseStorageKey('foo', '1234a', `${ch}`);
    }

    const illegalStarters = '0123456789_-';
    for (const ch of illegalStarters) {
      assert.throws(() => {
        const key = new PersistentDatabaseStorageKey('foo', '1234a', `${ch}ThenLegal`);
      });
      assert.throws(() => {
        const key = new MemoryDatabaseStorageKey('foo', '1234a', `${ch}ThenLegal`);
      });
    }
  });

  it(`fails when hex is invalid`, () => {
    assert.throws(() => {
      const key = new PersistentDatabaseStorageKey('foo', '', 'myDb');
    });
    assert.throws(() => {
      const key = new MemoryDatabaseStorageKey('foo', '', 'myDb');
    });
    assert.throws(() => {
      const key = new PersistentDatabaseStorageKey('foo', 'g', 'myDb');
    });
    assert.throws(() => {
      const key = new MemoryDatabaseStorageKey('foo', 'g', 'myDb');
    });
    assert.throws(() => {
      const key = new PersistentDatabaseStorageKey('foo', '1234a_', 'myDb');
    });
    assert.throws(() => {
      const key = new MemoryDatabaseStorageKey('foo', '1234a_', 'myDb');
    });
  });

  it(`creates child key with component persistent`, () => {
    const parent = new PersistentDatabaseStorageKey('parent', '1234a');
    const child = parent.childWithComponent('child');
    assert.instanceOf(child, PersistentDatabaseStorageKey);
    assert.equal(child.toString(), `${parent.toString()}/child`);
  });

  it(`creates child key with component non-persistent`, () => {
    const parent = new MemoryDatabaseStorageKey('parent', '1234a');
    const child = parent.childWithComponent('child');
    assert.instanceOf(child, MemoryDatabaseStorageKey);
    assert.equal(child.toString(), `${parent.toString()}/child`);
  });
});
