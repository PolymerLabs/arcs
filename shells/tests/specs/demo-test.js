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

const {seconds, waitFor, click, keys, openNewArc, marshalPersona, openArc} = require('../utils.js');

const searchFor = text => keys('input[search]', text);

describe('wait for server', () => {
  it('is not a test', async function() {
    //await browser.url(`http://localhost`);
    //await openNewArc(this.test.fullTitle(), 'firebase');
    // wait for ALDS to finish init ...
    console.log('waiting 10s in hopes ALDS spins up...');
    await browser.pause(seconds(10));
    console.log('...done');
  });
});

['pouchdb', 'firebase'].forEach(async storageType => {
  describe('demo ' + storageType, () => {
    it('restaurants', async function() {
      await openNewArc(this.test.fullTitle(), storageType);
      const search = `restaurants`;
      //const findRestaurants = `[title^="Find restaurants"]`;
      //const restaurantItem = `#webtest-title`;
      const reservation = `[title*="ou are "]`;
      const calendarAction = `[particle-host="Calendar::action"]`;
      await searchFor(search);
      //await click(findRestaurants);
      await chooseSuggestion('Find restaurants');
      // TODO(sjmiles): rendering tiles takes forever to stabilize
      //await browser.pause(seconds(10));
      //await click(restaurantItem);
      await click(reservation);
      await waitFor(calendarAction);
    });
    it('gifts', async function() {
      await openNewArc(this.test.fullTitle(), storageType);
      const products = `products`;
      const createList = `[title^="Create shopping list"]`;
      const buyGifts = `[title^="Buy gifts"]`;
      const checkManufacturer = `[title^="Check manufacturer"]`;
      const interests = `[title^="Find out"]`;
      await searchFor(products);
      await click(createList);
      await click(buyGifts);
      await click(checkManufacturer);
      await click(interests);
    });
  });

  const persona = `${marshalPersona(storageType)}-persistence`;
  describe('persistence ' + persona, () => {
    it('persists', async function() {
      await openArc(persona);
      await searchFor('profile');
      await chooseSuggestion('Edit user profile');
      await browser.pause(seconds(1));
      await openArc(persona);
      await browser.pause(seconds(5));
      await waitFor('div[chip]');
    });
  });
});

const chooseSuggestion = async name => {
  await click(`[title^="${name}"]`);
};
