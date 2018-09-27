// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle, importScripts */
defineParticle(({DomParticle, log}) => {

  return class extends DomParticle {
    update({item, collection}, state) {
      if (item && item.id !== state.item_id) {
        state.item_id = item.id;
        // TODO(sjmiles): was supposed to be type agnostic ... oh well
        if (!collection.find(show => show.showid === item.showid)) {
          this.updateSet('collection', item);
        }
      }
    }
  };
});
