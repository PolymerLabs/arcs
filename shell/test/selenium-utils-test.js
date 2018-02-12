/*
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var assert = chai.assert;

afterEach(function() {
  target.innerHTML = '';
});

describe('SeleniumUtils', function() {
  describe('#pierceShadowsSingle', function() {
    it('should cross a simple shadow boundary', function() {
      target.innerHTML = `
        <div outer>
        </div>`;
      const outer = target.querySelectorAll('div[outer]');
      assert.equal(outer.length, 1);
      const shadow = outer[0].attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div inner>
          <p goal>goal</p>
        </div>`;

      let result;

      result = pierceShadowsSingle(['div[outer]', 'div[inner]', 'p[goal]']);
      assert.equal(result.textContent, 'goal');

      result = pierceShadowsSingle(['div[outer]', 'p[goal]']);
      assert.equal(result.textContent, 'goal');
    });
    it('should cross several shadow boundaries', function() {
      target.innerHTML = `
        <div outer>
        </div>`;
      const outer = target.querySelectorAll('div[outer]');
      assert.equal(outer.length, 1);
      const firstShadow = outer[0].attachShadow({ mode: 'open' });
      firstShadow.innerHTML = `
        <div firstInner>
        </div>`;
      const secondShadow = firstShadow.children[0].attachShadow({ mode: 'open' });
      secondShadow.innerHTML = `
        <div secondInner>
          <p goal>goal</p>
        </div>`;

      let result;

      result = pierceShadowsSingle([
        'div[outer]',
        'div[firstInner]',
        'div[secondInner]',
        'p[goal]'
      ]);
      assert.equal(result.textContent, 'goal');

      result = pierceShadowsSingle([
        'div[outer]',
        'div[firstInner]',
        'p[goal]'
      ]);
      assert.equal(result.textContent, 'goal');
    });
    it('should navigate a more complex tree', function() {
      target.innerHTML = `
        <div outer>
          <div badBranch>
            <div deeper>
            </div>
          </div>
        </div>`;
      const outer = target.querySelectorAll('div[outer]');
      assert.equal(outer.length, 1);
      const firstShadow = outer[0].attachShadow({ mode: 'open' });
      firstShadow.innerHTML = `
        <div firstInner>
        </div>`;
      const secondShadow = firstShadow.children[0].attachShadow({ mode: 'open' });
      secondShadow.innerHTML = `
        <div secondInner>
          <p goal>goal</p>
          <div offshoot>
          </div>
        </div>`;

      let result;

      result = pierceShadowsSingle([
        'div[outer]',
        'div[firstInner]',
        'div[secondInner]',
        'p[goal]'
      ]);
      assert.equal(result.textContent, 'goal');

      result = pierceShadowsSingle([
        'div[outer]',
        'div[firstInner]',
        'p[goal]'
      ]);
      assert.equal(result.textContent, 'goal');
    });
  });
  describe('#pierceShadows', function() {
    it('should return multiple valid matches', function() {
      target.innerHTML = `
        <div outer>
        </div>`;
      const outer = target.querySelectorAll('div[outer]');
      assert.equal(outer.length, 1);
      const shadow = outer[0].attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div inner>
          <p goal>goal</p>
        </div>
        <div inner-two>
          <p goal>goal two</p>
        </div>`;

      let result;

      result = pierceShadows(['div[outer]', 'div[inner]', 'p[goal]']);
      assert.equal(result[0].textContent, 'goal');

      result = pierceShadows(['div[outer]', 'p[goal]']);
      assert.equal(result[0].textContent, 'goal');
      assert.equal(result[1].textContent, 'goal two');
    });
  });
});
