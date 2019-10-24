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
  `
};

const Application = {
  ready() {
    // message channel is ready, time to configure
    this.send({message: 'configure', config});
  },
  context() {
    // testing ingestion
    this.send({message: 'enableIngestion'});
    this.send({message: 'ingest', entity: {type: 'person', jsonData: `{"name": "John Hancock"}`}});
    setTimeout(() => {
      this.ingestTid = this.send({message: 'spawn', recipe: 'PersonAutofill'});
    }, 300);
    // upon ready, we right away ask for an Arc
    this.arcTid = this.send({message: 'spawn', recipe: 'Notification'});
  },
  // handle packets that were not otherwised consumed
  receive(packet) {
    const {content: slot} = packet;
    // TODO(sjmiles): UiParticles that do not implement `render` return no content(?)
    if (slot) {
      const {model} = slot.content;
      // if we get a slot-render request for 'notification' modality, make a toast for it
      if (model.modality === 'notification') {
        addToast(model.text);
      }
    }
  },
  // platform calls here if toast is clicked
  async notificationClick(toast) {
    // if we haven't already created a Restaurants Arc...
    if (!this.restaurantsTid && toast.innerText.includes('dinner')) {
      // spin up a render surface (like a WebView)
      await waitForRenderSurface();
      // spawn 'Restaurants' arc
      const tid = Application.send({message: 'spawn', recipe: 'Restaurants'});
      // add 'Reservations' recipes
      Application.send({tid, message: 'recipe', recipe: 'MakeReservations'});
      // remember the arc's transaction identifier
      this.restaurantsTid = tid;
    }
  }
};

connectToPlatform(Application);
