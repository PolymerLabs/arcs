/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, log}) => {

  return class extends DomParticle {
    update({randomArtist}) {
      if (randomArtist) {
        const entities = [
          {type: 'artist', name: 'Taylor Swift', source: 'com.weaseldev.fortunecookies'},
          {type: 'artist', name: 'Stone Sour', source: 'com.weaseldev.fortunecookies'},
          {type: 'artist', name: 'Metallica', source: 'com.weaseldev.fortunecookies'}
        ];
        const artist = entities[Math.floor(randomArtist.next * entities.length)];
        this.updateSingleton('artist', artist);
      }
    }
  };

});
