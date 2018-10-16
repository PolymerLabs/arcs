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

import {PouchDbKey} from '../../../ts-build/storage/pouchdb/pouch-db-key.js';

import 'chai/register-assert';

describe('pouch-db-key', () => {
  it('fails for non pouchdb: prefixed keys', () => {
    assert.throws(() => {
      new PouchDbKey('http://www.google.com/');
    }, Error);
  });

  it('parses a memory url', () => {
    let key = 'pouchdb://memory/user/';
    let pkey = new PouchDbKey(key);
    assert.equal(pkey.toString(), key);
    assert.equal(pkey.dbLocation, 'memory');
    assert.equal(pkey.dbName, 'user');
    assert.equal(pkey.location, '');
    assert.equal(pkey.dbCacheKey(), 'memory/user');
  });

  it('parses a local url', () => {
    let key = 'pouchdb://local/user/';
    let pkey = new PouchDbKey(key);
    assert.equal(pkey.toString(), key);
    assert.equal(pkey.dbLocation, 'local');
    assert.equal(pkey.dbName, 'user');
    assert.equal(pkey.location, '');
    assert.equal(pkey.dbCacheKey(), 'local/user');
  });

  it('parses a remote url', () => {
    let key = 'pouchdb://localhost:8080/user/';
    let pkey = new PouchDbKey(key);
    assert.equal(pkey.toString(), key);
    assert.equal(pkey.dbLocation, 'localhost:8080');
    assert.equal(pkey.dbName, 'user');
    assert.equal(pkey.location, '');
    assert.equal(pkey.dbCacheKey(), 'localhost:8080/user');
  });

  it('parses a remote url with location', () => {
    let key = 'pouchdb://localhost:8080/user/prefix/path';
    let pkey = new PouchDbKey(key);
    assert.equal(pkey.toString(), key);
    assert.equal(pkey.location, 'prefix/path');
    assert.equal(pkey.dbName, 'user');
    assert.equal(pkey.location, 'prefix/path');
    assert.equal(pkey.dbCacheKey(), 'localhost:8080/user');
  });

  describe('childKeyForHandle', () => {
    const remoteKey = new PouchDbKey('pouchdb://localhost:8080/user/prefix/path');

    it('fails for invalid id', () => {
      assert.throws(() => {
        remoteKey.childKeyForHandle('');
      }, Error);
    });

    it('creates a new PouchDbKey with id suffix', () => {
      let childKey = remoteKey.childKeyForHandle('99');
      assert.equal(childKey.toString(),
        'pouchdb://localhost:8080/user/prefix/path/handles/99');
    });
  });
});
