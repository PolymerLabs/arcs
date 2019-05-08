/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, log}) => {
  return class extends DomParticle {
    async onHandleUpdate(handle, update) {
      if (handle.name !== 'uniqueShows') {
        super.onHandleUpdate(handle, update);
      } else log('ignoring uniqueShows update');
    }
    update({shows}) {
      this.clearHandle('uniqueShows');
      if (shows) {
        const map = {};
        const unique = [];
        shows.forEach(show => {
          if (!map[show.showid]) {
            map[show.showid] = show;
            unique.push(show);
          }
        });
        this.appendEntitiesToHandle('uniqueShows', unique);
        log(unique);
      }
    }
  };
});
