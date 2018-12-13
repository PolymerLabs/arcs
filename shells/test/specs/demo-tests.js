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

const findRestaurants = `[title^="[demo] find restaurants"]`;

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
    const tvInfo = `[title^="TV show information"]`;
    //const bodyguardIsOn = `[title^="Bodyguard is on BBC One"]`;
    // TODO(sjmiles): wait for context to prepare, need a signal instead
    await browser.pause(seconds(5));
    await receiveEntity({type: 'tv_show', name: 'bodyguard'});
    await waitFor(tvInfo);
    //await searchFor('*');
    //await waitFor(bodyguardIsOn);
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
    //await click(restaurantItem);
    //await click(reservation);
    //await waitFor(calendarAction);
  });
  it('gifts', async function() {
    await openNewArc(this.test.fullTitle());
    const search = `gifts`;
    const buyGifts = `[title^="Find out"]`;
    const item = `[particle-host="ItemMultiplexer::item"]`;
    await searchFor(search);
    await click(buyGifts);
    await waitFor(item);
  //   const search = `products`;
  //   const showProducts = `[title^="Show products"]`;
  //   const items = `[particle-host="ItemMultiplexer::item"]`;
  //   const checkShipping = `[title^="Check shipping"]`;
  //   const annotations = `[particle-host="Multiplexer::annotation"]`;
  //   const checkManufacturer = `[title^="Check manufacturer"]`;
  //   const interests = `[title^="Find out"]`;
  //   await openNewArc(this.test.fullTitle());
  //   await searchFor(search);
  //   await click(showProducts);
  //   await waitFor(items);
  //   await click(checkShipping);
  //   await waitFor(annotations);
  //   await click(checkManufacturer);
  //   await click(interests);
  });
});
