// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

afterEach(function() {
  target.innerHTML = '';
  db.reset();
});

describe('DancingDots', function() {
  class TestDancingDots extends DancingDots {
    constructor(element) {
      super(element);
    }
  }

  customElements.define('test-dancing-dots', TestDancingDots);

  describe('#dance', function() {
    it('can start and stop', function() {
      const dots = document.createElement('test-dancing-dots');
      target.appendChild(dots);

      assert.equal(false, dots.active);
      [...dots._bullets].every(b => !b._animation);

      dots.active = false;  // nothing happens
      assert.equal(false, dots.active);
      [...dots._bullets].every(b => !b._animation);

      // Activate dots
      dots.active = true;
      assert.equal(true, dots.active);
      [...dots._bullets].every(b => b._animation.playState == 'running');

      // Deactivate dots
      dots.active = false;
      assert.equal(false, dots.active);
      [...dots._bullets].every(b => b._animation.playState == 'idle');
    });
  });
});
