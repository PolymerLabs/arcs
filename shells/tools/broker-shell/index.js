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

const config = {
  rootPath: '.',
  urlMap: {
    'https://$arcs/': `../../../`,
    'https://$particles/': `../../../particles/`,
    'https://$build/': `../../lib/build/`
  },
  storage: 'volatile://',
  manifest: `
    import 'https://$particles/Pipes/Pipes.arcs'
    import 'https://$particles/Restaurants/Restaurants.arcs'
    import 'https://$particles/Notification/Notification.arcs'
  `};

const Application = {
  ready() {
    // message channel is ready, time to configure
    this.send({message: 'configure', config});
  },
  context() {
    // upon ready, we right away ask for an Arc
    this.send({message: 'runArc', arcId: 'notification-arc', recipe: 'Notification'});
  },
  // handle packets that were not otherwised consumed
  // TODO(sjmiles): this code is confused about what a `packet` is.
  // There are 'bus-message packets' and 'ui-broker packets'
  // `receive` is generally used for the former, but this consumes the latter.
  // I'm not cleaning it up right now because this app is likely to become vestigial.
  receive(packet) {
    const {content} = packet;
    // TODO(sjmiles): UiParticles that do not implement `render` return no content(?)
    if (content) {
      const {model} = content;
      // if we get a slot-render request for 'notification' modality, make a toast for it
      if (model.modality === 'notification') {
        addToast(model.text);
      }
    }
  },
  // platform calls here if toast is clicked
  async notificationClick(toast) {
    // if we haven't already created a Restaurants Arc...
    if (!this.restaurantsArcId && toast.innerText.includes('dinner')) {
      // spin up a render surface (like a WebView)
      await waitForRenderSurface();
      // choose arcId
      this.restaurantsArcId = 'restaurant-arc';
      // spawn 'Restaurants' arc
      Application.send({message: 'runArc', recipe: 'Restaurants', arcId: this.restaurantsArcId});
      // add 'Reservations' recipes
      //Application.send({arcId, message: 'recipe', recipe: 'MakeReservations'});
    }
  }
};

connectToPlatform(Application);
