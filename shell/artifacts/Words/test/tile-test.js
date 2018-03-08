// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

describe('Tile', function() {
  describe('#x', function() {
    it('should compute x coordinate correctly', function() {
      const tile00 = new Tile(0, 'A');
      assert.equal(0, tile00.x);
      const tile66 = new Tile(48, 'A');
      assert.equal(6, tile66.x);
      const tile42 = new Tile(30, 'A');
      assert.equal(2, tile42.x);
    });
  });

  describe('#y', function() {
    it('should compute y coordinate correctly', function() {
      const tile00 = new Tile(0, 'A');
      assert.equal(0, tile00.y);
      const tile66 = new Tile(48, 'A');
      assert.equal(6, tile66.y);
      const tile42 = new Tile(30, 'A');
      assert.equal(4, tile42.y);
    });
  });

  describe('#isShiftedDown', function() {
    it('should report alternating tile columns from zero on as shifted down',
       function() {
         assert.isTrue(new Tile(0, 'A').isShiftedDown);
         assert.isFalse(new Tile(1, 'B').isShiftedDown);
         assert.isTrue(new Tile(2, 'C').isShiftedDown);
       });
  });

  describe('#toString', function() {
    it('should include all member data', function() {
      const tile = new Tile(0, 'A');
      assert.equal(
          '[charIndex=0, letter=A, style=Symbol(normal), x=0, y=0]',
          tile.toString());
    });
  });
});
