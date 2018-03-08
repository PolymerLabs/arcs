// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

describe('Dictionary', function() {
  const dictionary = new Dictionary('foo\nbar\n baz ');

  describe('#contains()', function() {
    it('should report present words', function() {
      assert.isTrue(dictionary.contains('foo'));
      assert.isTrue(dictionary.contains('bar'));
      assert.isTrue(dictionary.contains('baz'));
    });

    it('should not report absent words', function() {
      assert.isFalse(dictionary.contains('burrito'));
    });

    it('should ignore case on lookup', function() {
      assert.isTrue(dictionary.contains('foo'));
      assert.isTrue(dictionary.contains('FOO'));
    });

    it('should ignore case on construction', function() {
      const altDictionary = new Dictionary('FOO');
      assert.isTrue(dictionary.contains('foo'));
      assert.isTrue(dictionary.contains('FOO'));
    });
  });

  describe('#size', function() {
    it('should report non-empty size correctly', function() {
      assert.equal(dictionary.size, 3);
    });
    it('should report empty size correctly', function() {
      assert.equal(new Dictionary('').size, 0);
    });
  });
});
