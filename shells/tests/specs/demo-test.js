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

const {seconds, waitFor, click, keys, openNewArc} = require('../utils.js');

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

['pouchdb', 'firebase'].forEach(async storage => {
  //describe('pipes ' + storage, () => {
  //   it('searches', async function() {
  //     await openNewArc(this.test.fullTitle(), undefined, storage);
  //     // TODO(sjmiles): wait for context to prepare, need a signal instead
  //     await browser.pause(seconds(5));
  //     await receiveEntity({type: 'search', query: 'restaurants'});
  //     //await waitFor(findRestaurants);
  //   });
  //   it('receives', async function() {
  //     await openNewArc(this.test.fullTitle(), undefined, storage);
  //     const bodyguardIsOn = `[title^="Bodyguard is on BBC One"]`;
  //     // TODO(sjmiles): wait for context to prepare, need a signal instead
  //     await browser.pause(seconds(5));
  //     await receiveEntity({type: 'tv_show', name: 'bodyguard'});
  //     await waitFor(bodyguardIsOn);
  //   });
  // });

  describe('demo ' + storage, () => {
    it('restaurants', async function() {
      await openNewArc(this.test.fullTitle(), storage);
      const search = `restaurants`;
      const findRestaurants = `[title^="Find restaurants"]`;
      const restaurantItem = `#webtest-title`;
      const reservation = `[title*="ou are "]`;
      const calendarAction = `[particle-host="Calendar::action"]`;
      await searchFor(search);
      await click(findRestaurants);
      // TODO(sjmiles): rendering tiles takes forever to stabilize
      //await browser.pause(seconds(10));
      //await click(restaurantItem);
      await click(reservation);
      await waitFor(calendarAction);
    });
    it('gifts', async function() {
      await openNewArc(this.test.fullTitle(), storage);
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
});
