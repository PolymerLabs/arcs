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

import 'chai/register-expect';

describe('pouch-db-key', () => {
  it('fails for non pouchdb: prefixed keys', () => {
    expect(() => {
      new PouchDbKey('http://www.google.com/');
    }).to.throw(Error);
  });

  it('parses a memory url', () => {
    let key = 'pouchdb://memory/user/';
    let pkey = new PouchDbKey(key);
    expect(pkey.toString()).to.equal(key);
    expect(pkey.dbLocation).to.equal('memory');
    expect(pkey.dbName).to.equal('user');
    expect(pkey.location).to.equal('');
    expect(pkey.dbCacheKey()).to.equal('memory/user');
  });

  it('parses a local url', () => {
    let key = 'pouchdb://local/user/';
    let pkey = new PouchDbKey(key);
    expect(pkey.toString()).to.equal(key);
    expect(pkey.dbLocation).to.equal('local');
    expect(pkey.dbName).to.equal('user');
    expect(pkey.location).to.equal('');
    expect(pkey.dbCacheKey()).to.equal('local/user');
  });

  it('parses a remote url', () => {
    let key = 'pouchdb://localhost:8080/user/';
    let pkey = new PouchDbKey(key);
    expect(pkey.toString()).to.equal(key);
    expect(pkey.dbLocation).to.equal('localhost:8080');
    expect(pkey.dbName).to.equal('user');
    expect(pkey.location).to.equal('');
    expect(pkey.dbCacheKey()).to.equal('localhost:8080/user');
  });

  it('parses a remote url with location', () => {
    let key = 'pouchdb://localhost:8080/user/prefix/path';
    let pkey = new PouchDbKey(key);
    expect(pkey.toString()).to.equal(key);
    expect(pkey.location).to.equal('prefix/path');
    expect(pkey.dbName).to.equal('user');
    expect(pkey.location).to.equal('prefix/path');
    expect(pkey.dbCacheKey()).to.equal('localhost:8080/user');
  });

  describe('childKeyForHandle', () => {
    const remoteKey = new PouchDbKey('pouchdb://localhost:8080/user/prefix/path');

    it('fails for invalid id', () => {
      expect(() => {
        remoteKey.childKeyForHandle('');
      }).to.throw(Error);
    });

    it('creates a new PouchDbKey with id suffix', () => {
      let childKey = remoteKey.childKeyForHandle('99');
      expect(childKey.toString()).to.equal(
        'pouchdb://localhost:8080/user/prefix/path/handles/99');
    });
  });
});
