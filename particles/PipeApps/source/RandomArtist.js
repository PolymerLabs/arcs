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

defineParticle(({SimpleParticle, html, log}) => {

  return class extends SimpleParticle {
    update({randomArtist}) {
      if (randomArtist) {
        const entities = [
          {type: 'artist', name: 'Taylor Swift', source: 'com.unknown'},
          {type: 'artist', name: 'Stone Sour', source: 'com.unknown'},
          {type: 'artist', name: 'Metallica', source: 'com.unknown'}
        ];
        const artist = entities[Math.floor(randomArtist.next * entities.length)];
        this.set('artist', artist);
      }
    }
  };

});
