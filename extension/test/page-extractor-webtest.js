// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

afterEach(function() {
  target.innerHTML = '';
});

describe('PageExtractor', function() {
  describe('#extractEntities()', function() {
    it('should extract simple product info', function() {
      target.innerHTML = `
          <div itemscope itemtype="http://schema.org/Product">
            <span itemprop="name">Chile Verde Burrito</span>
          </div>`;
      return extractEntities(document, window.location).then(function(results) {
        assert.equal(2, results.length);
        assert.deepEqual(
            {'@type': 'http://schema.org/Product', name: 'Chile Verde Burrito'},
            results[0]);
        // The web page url contains a machine specific path so just check the
        // file name presence.
        assert.equal('http://schema.org/WebPage', results[1]['@type']);
        assert.equal('Arcs Extension Mocha Tests', results[1]['name']);
        assert.isOk(results[1]['url'].includes('index.test.html'));
      });
    });
  });
});
