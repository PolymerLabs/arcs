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

defineParticle(({Particle, html, log}) => {
  return class extends Particle {
    addSlotProxy(slotlet) {
      super.addSlotProxy(slotlet);
      slotlet.render({text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'});
    }
  };
});
