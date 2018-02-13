// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

afterEach(function() {
  target.innerHTML = '';
});

describe('ChromeExtensionDataProcessing', function() {
  describe('#filter', function() {
    it('should skip entities without a name', function() {
      let sample = {
        'https://my/great/site': [{ '@type': 'http://TypeA' }],
        'http://my/terrible/site': [
          { '@type': 'http://TypeA', name: 'TypeA_MTS' }
        ]
      };
      let expected = {
        'https://my/great/site': [],
        'http://my/terrible/site': [
          { '@type': 'http://TypeA', name: 'TypeA_MTS' }
        ]
      };

      let result = filter(sample);
      assert.deepEqual(result, expected);
    });
  });
  describe('#flatten()', function() {
    it('should organize entities by data type', function() {
      let sample = {
        'http://my/great/site': [{ '@type': 'TypeA', name: 'TypeA_MGS' }],
        'http://my/terrible/site': [{ '@type': 'TypeA', name: 'TypeA_MTS' }]
      };
      let expected = {
        TypeA: [
          { '@type': 'TypeA', name: 'TypeA_MGS' },
          { '@type': 'TypeA', name: 'TypeA_MTS' }
        ]
      };

      let result = flatten(sample);
      assert.deepEqual(result, expected);
    });
    it('should organize entities by data type (multiple data types should be kept separate)', function() {
      let sample = {
        'http://my/great/site': [
          { '@type': 'TypeA', name: 'TypeA_MGS' },
          { '@type': 'TypeB', name: 'TypeB_MGS' }
        ],
        'http://my/terrible/site': [
          { '@type': 'TypeA', name: 'TypeA_MTS' },
          { '@type': 'TypeB', name: 'TypeB_MTS' }
        ]
      };
      let expected = {
        TypeA: [
          { '@type': 'TypeA', name: 'TypeA_MGS' },
          { '@type': 'TypeA', name: 'TypeA_MTS' }
        ],
        TypeB: [
          { '@type': 'TypeB', name: 'TypeB_MGS' },
          { '@type': 'TypeB', name: 'TypeB_MTS' }
        ]
      };

      let result = flatten(sample);
      assert.deepEqual(result, expected);
    });
    it('should ignore http vs https', function() {
      let sample = {
        'https://my/great/site': [
          { '@type': 'https://TypeA', name: 'TypeA_MGS' },
          { '@type': 'https://TypeB', name: 'TypeB_MGS' }
        ],
        'http://my/terrible/site': [
          { '@type': 'http://TypeA', name: 'TypeA_MTS' },
          { '@type': 'http://TypeB', name: 'TypeB_MTS' }
        ]
      };
      let expected = {
        'http://TypeA': [
          { '@type': 'https://TypeA', name: 'TypeA_MGS' },
          { '@type': 'http://TypeA', name: 'TypeA_MTS' }
        ],
        'http://TypeB': [
          { '@type': 'https://TypeB', name: 'TypeB_MGS' },
          { '@type': 'http://TypeB', name: 'TypeB_MTS' }
        ]
      };

      let result = flatten(sample);
      assert.deepEqual(result, expected);
    });
  });
  describe('#deduplicate()', function() {
    it('should deduplicate', function() {
      let sample = {
        TypeA: [
          { '@type': 'TypeA', name: 'same' },
          { '@type': 'TypeA', name: 'same' },
          { '@type': 'TypeA', name: 'different' }
        ]
      };
      let expected = {
        TypeA: [
          { '@type': 'TypeA', name: 'same' },
          { '@type': 'TypeA', name: 'different' }
        ]
      };

      let result = deduplicate(sample);
      assert.deepEqual(result, expected);
    });
  });
});
