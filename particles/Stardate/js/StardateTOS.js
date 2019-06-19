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

defineParticle(({DomParticle, html, log}) => {

  const MIN_STARDATE = 1000;
  const MAX_STARDATE = 9999;
  // Via https://nasa.tumblr.com/post/150044040289/top-10-star-trek-planets-chosen-by-our-scientists
  const PLANETS = [
    'Vulcan', 'Andoria', 'Risa', '"Shore Leave" planet, Omicron Delta region', 'Nibiru',
    'Wolf 359', 'Eminar VII', 'Remus', 'Janus VI', 'Earth'
  ];

  const arand = async () => Promise.resolve(Math.random());

  return class extends DomParticle {
    update(props, state) {
      if (!state.computed) {
        state.computed = true;
        this.computeStardate();
      }
      if (state.stardate) {
        this.updateSingleton('stardate', {date: state.stardate});
      }
      if (state.destination) {
        this.updateSingleton('destination', {name: state.destination});
      }
    }
    async computeStardate() {
      // Aims to follow logic per https://en.wikipedia.org/wiki/Stardate#The_Original_Series_era

      // TODO(wkorman): Intent was to keep track of the "last stardate" within
      // an arc and use that as the initial prefix. However, we need to find
      // a way to do this that doesn't break with SpecEx, so for now it's a
      // new date every time.

      const prefix = MIN_STARDATE;
      const remainder = MAX_STARDATE - prefix;
      const stardate = prefix + Math.floor((await arand()) * remainder);
      const intraday = Math.trunc((new Date().getHours() / 24) * 10);
      const destination = PLANETS[Math.floor((await arand()) * (PLANETS.length - 1))];
      this.state = {
        stardate: `${stardate}.${intraday}`,
        destination
      };
    }
  };
});
