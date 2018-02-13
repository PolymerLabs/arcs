// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

afterEach(function() {
  db.reset();
});

describe('FakeDatabase', function() {
  const db = new FakeDatabase();

  describe('#child', function() {
    it('should create and cache top level child', function() {
      const fooDatabase = db.child('foo');
      assert.isNotNull(fooDatabase);
      assert.equal(db.child('foo'), fooDatabase);
      assert.equal(db.child('foo'), fooDatabase);
    });

    it('should create and cache nested children', function() {
      const fooDatabase = db.child('foo');
      const barDatabase = db.child('foo').child('bar');
      const bazDatabase = db
        .child('foo')
        .child('bar')
        .child('baz');
      const schminkDatabase = db.child('foo').child('schmink');
      assert.isNotNull(fooDatabase);
      assert.isNotNull(barDatabase);
      assert.isNotNull(bazDatabase);
      assert.isNotNull(schminkDatabase);

      assert.equal(db.child('foo').child('bar'), barDatabase);
      assert.equal(db.child('foo'), fooDatabase);
      assert.equal(db.child('foo').child('bar'), barDatabase);
      assert.equal(
        db
          .child('foo')
          .child('bar')
          .child('baz'),
        bazDatabase
      );
      assert.equal(db.child('foo').child('schmink'), schminkDatabase);
    });
  });

  describe('#push', function() {
    it('should support pushing values', function() {
      assert.equal(db.push({ a: 1, b: 2 }).key, 1);
      assert.equal(db.push({ a: 1, b: 2 }).key, 2);
      assert.equal(db.push({ c: 3, d: 4 }).key, 3);
    });
  });

  describe('#update', function() {
    it('should support update and remember the last update values', function() {
      const values = { a: 1 };
      db.update(values);
      assert.equal(db.lastUpdate, values);
    });
  });

  describe('#reset', function() {
    it('should support resetting database state', function() {
      const fooDatabase = db.child('foo');
      assert.isNotNull(db.child('foo'));
      assert.equal(db.child('foo'), fooDatabase);

      assert.equal(db.push({ a: 1, b: 2 }).key, 1);
      assert.equal(db.push({ a: 1, b: 2 }).key, 2);

      const values = { a: 1 };
      db.update(values);
      assert.equal(db.lastUpdate, values);

      db.reset();

      const fooDatabase2 = db.child('foo');
      assert.isNotNull(db.child('foo'));
      assert.notEqual(fooDatabase2, fooDatabase);

      assert.equal(db.push({ a: 1, b: 2 }).key, 1);
      assert.isUndefined(db.lastUpdate);
      db.update(values);
      assert.equal(db.lastUpdate, values);
    });
  });
});
