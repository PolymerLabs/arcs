/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global browser */

const assert = require('assert');
const {clickSuggestion, openNewArc} = require('../utils.js');

['pouchdb', 'firebasetest'].forEach(async storage => {
  describe('Products Recipes storage=' + storage, () => {
    it('clicks on all the gift suggestions', async function() {
      openNewArc(this.test.fullTitle(), storage);
      browser.keys('products');

      clickSuggestion('Create shopping list');
      clickSuggestion('Buy gifts');
      clickSuggestion('Check manufacturer');
      clickSuggestion('Find out');

      browser.pause(1000);
      // browser.debug();
    });
  });
});
