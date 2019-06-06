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

  describe('Restaurants Recipe storage=' + storage, () => {
    it('restaurants suggestions', async function() {
      openNewArc(this.test.fullTitle(), storage);

      console.log('Search for "restaurants"');
      browser.keys('restaurants');

      clickSuggestion('Find restaurants near you.');
      clickSuggestion('ou are free');

      console.log('Waiting for the Calendar Widget to render');
      $('#arc').shadow$('[particle-host="Calendar::action"]').waitForDisplayed(1000);

      
      const restaurantItem = $('#arc')
            .shadow$('[particle-host="SelectableTiles::root"]')
            .shadow$('[particle-host="TileMultiplexer::tile"]');
      
      console.log('Waiting for the restaurant item to render');
      restaurantItem.waitForDisplayed(20000); // restaurant results are slow...
      
      restaurantItem.click();
      console.log('Wait for the restaurant modal to render');

      $('#arc')
        .shadow$('[particle-host="DetailSlider::modal"]')
        .shadow$('[particle-host="RestaurantDetail::content"]')
        .waitForDisplayed(1000);
    });
  });
});
