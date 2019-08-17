/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {connectToPlatform, waitForRenderSurface, addToast} from './lib/platform.js';

const Application = {
  ready() {
    // upon ready, we right away ask for an Arc
    this.arcTid = this.send({message: 'spawn', recipe: 'Notification'});
  },
  // handle packets that were not otherwise consumed
  receive(packet) {
    // if we get a slot-render request for 'notification' modality, make a toast for it
    if (packet.message === 'data' && packet.data.modality === 'notification') {
      addToast(packet.data.text);
    }
  },
  // platform calls here if toast is clicked
  async notificationClick(toast) {
    // do something ...
  }
};

connectToPlatform(Application);
