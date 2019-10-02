/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

 /* global defineParticle */

 defineParticle(({SimpleParticle, html, log}) => {
  const template = html`
 <div style="padding: 8px;">
  Captain's log, stardate <b>{{stardate}}</b>.
  Our destination is <b>{{destination}}</b>.
</div>
   `;

   return class extends SimpleParticle {
    get template() {
      return template;
    }
    render({stardate, destination}, state) {
      if (stardate && destination) {
        return {
          stardate: stardate.date,
          destination: destination.name
        };
      }
    }
  };
});
