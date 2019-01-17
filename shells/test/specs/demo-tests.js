/*
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global browser */
/* eslint-disable no-invalid-this */

const {seconds, waitFor, click, keys, openNewArc} = require('../utils.js');

const searchFor = text => keys('input[search]', text);

const receiveEntity = async entity =>
  browser.execute(json => window.ShellApi.receiveEntity(json), JSON.stringify(entity));

const findRestaurants = `[title^="Find restaurants"]`;

describe('pipes', function() {
  it('searches', async function() {
    await openNewArc(this.test.fullTitle());
    // TODO(sjmiles): wait for context to prepare, need a signal instead
    await browser.pause(seconds(5));
    await receiveEntity({type: 'search', query: 'restaurants'});
    //await waitFor(findRestaurants);
  });
  it('receives', async function() {
    await openNewArc(this.test.fullTitle());
    const bodyguardIsOn = `[title^="Bodyguard is on BBC One"]`;
    // TODO(sjmiles): wait for context to prepare, need a signal instead
    await browser.pause(seconds(5));
    await receiveEntity({type: 'tv_show', name: 'bodyguard'});
    await waitFor(bodyguardIsOn);
  });
});

describe('demo', function() {
  it('restaurants', async function() {
    await openNewArc(this.test.fullTitle());
    const search = `restaurants`;
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
    await openNewArc(this.test.fullTitle());
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
