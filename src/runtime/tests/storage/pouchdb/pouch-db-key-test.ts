/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * Unit tests for PouchDbKey.
 */

import {assert} from '../../../../platform/chai-web.js';
import {PouchDbKey} from '../../../storage/pouchdb/pouch-db-key.js';

describe('pouch-db-key', () => {
  it('fails for non pouchdb: prefixed keys', () => {
    assert.throws(() => {
      const key = new PouchDbKey('http://www.google.com/');
    }, Error);
  });

  it('parses a memory url', () => {
    const key = 'pouchdb://memory/user/';
    const pkey = new PouchDbKey(key);
    assert.strictEqual(pkey.toString(), key);
    assert.strictEqual(pkey.dbLocation, 'memory');
    assert.strictEqual(pkey.dbName, 'user');
    assert.strictEqual(pkey.location, '');
    assert.strictEqual(pkey.dbCacheKey(), 'memory/user');
  });

  it('parses a local url', () => {
    const key = 'pouchdb://local/user/';
    const pkey = new PouchDbKey(key);
    assert.strictEqual(pkey.toString(), key);
    assert.strictEqual(pkey.dbLocation, 'local');
    assert.strictEqual(pkey.dbName, 'user');
    assert.strictEqual(pkey.location, '');
    assert.strictEqual(pkey.dbCacheKey(), 'local/user');
  });

  it('parses a remote url', () => {
    const key = 'pouchdb://localhost:8080/user/';
    const pkey = new PouchDbKey(key);
    assert.strictEqual(pkey.toString(), key);
    assert.strictEqual(pkey.dbLocation, 'localhost:8080');
    assert.strictEqual(pkey.dbName, 'user');
    assert.strictEqual(pkey.location, '');
    assert.strictEqual(pkey.dbCacheKey(), 'localhost:8080/user');
  });

  it('parses a remote url with location', () => {
    const key = 'pouchdb://localhost:8080/user/prefix/path';
    const pkey = new PouchDbKey(key);
    assert.strictEqual(pkey.toString(), key);
    assert.strictEqual(pkey.location, 'prefix/path');
    assert.strictEqual(pkey.dbName, 'user');
    assert.strictEqual(pkey.location, 'prefix/path');
    assert.strictEqual(pkey.dbCacheKey(), 'localhost:8080/user');
  });

  describe('child keys', () => {
    // Avoid initialising non-POD variables globally, since they would be constructed even when
    // these tests are not going to be executed (i.e. another test file uses 'only').
    let remoteKey;
    before(() => {
      remoteKey = new PouchDbKey('pouchdb://localhost:8080/user/prefix/path');
    });

    it('childKeyForHandle fails for invalid id', () => {
      assert.throws(() => remoteKey.childKeyForHandle(''), Error);
    });

    it('childKeyForHandle creates a new PouchDbKey with id suffix', () => {
      const childKey = remoteKey.childKeyForHandle('99');
      assert.strictEqual(childKey.toString(),
        'pouchdb://localhost:8080/user/prefix/path/handles/99');
    });

    it('childKeyForArcInfo creates a new PouchDbKey with fixed suffix', () => {
      const childKey = remoteKey.childKeyForArcInfo();
      assert.strictEqual(childKey.toString(),
        'pouchdb://localhost:8080/user/prefix/path/arc-info');
    });
  });
});
