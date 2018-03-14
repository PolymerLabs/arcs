// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

afterEach(function() {
  target.innerHTML = '';
});

describe('EventPage', function() {
  describe('#_prepareResults()', function() {
    it('should prepare keys', function() {
      let result = _prepareResults([
        {
          tab: {id: 12, url: 'urla'},
          result: [{name: 'entitya1'}, {name: 'entityb2'}]
        },
        {
          tab: {id: 13, url: 'urlb'},
          result: [{name: 'entitya1'}, {name: 'entityb2'}]
        }
      ]);
      assert.isOk(result);
      assert.isOk(
          result.hasOwnProperty('urla'),
          `result didn't have a urla key ${result}`);
      assert.deepEqual(
          [{name: 'entitya1'}, {name: 'entityb2'}], result['urla']);
    });
    it('should trim out keys without values', function() {
      let result = _prepareResults([
        {
          tab: {id: 12, url: 'urla'},
          result: [{name: 'entitya1'}, {name: 'entityb2'}]
        },
        {tab: {id: 13, url: 'empty'}}
      ]);
      assert.isOk(result);
      assert.isOk(
          result.hasOwnProperty('urla'),
          `result didn't have a urla key ${result}`);
      assert.isNotOk(
          result.hasOwnProperty('urlb'),
          `result had an 'empty' key (presumably with an empty result list: ${
              result['empty']})`);
    });
  });
});
