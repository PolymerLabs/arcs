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
const {openNewArc} = require('../utils.js');

const receiveEntity = async entity =>
      browser.execute(json => window.ShellApi.receiveEntity(json), JSON.stringify(entity));

['firebasetest'].forEach(async storage => {
  describe.skip('pipes ' + storage, async () => {
    it('searches', async function() {
      openNewArc(this.test.fullTitle(), storage);
      // TODO(sjmiles): wait for context to prepare, need a signal instead
      browser.pause(5000);
      await receiveEntity({type: 'search', query: 'restaurants'});
      //await waitFor(findRestaurants);
    });
    it('receives', async () => {
      openNewArc(this.test.fullTitle(), storage);
      const bodyguardIsOn = `[title^="Bodyguard is on BBC One"]`;
      // TODO(sjmiles): wait for context to prepare, need a signal instead
      browser.pause(seconds(5));
      await receiveEntity({type: 'tv_show', name: 'bodyguard'});
      await waitFor(bodyguardIsOn);
    });
  });
});
