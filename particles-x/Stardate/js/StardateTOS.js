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
  const MIN_STARDATE = 1000;
  const MAX_STARDATE = 9999;
  // Via https://nasa.tumblr.com/post/150044040289/top-10-star-trek-planets-chosen-by-our-scientists
  const PLANETS = [
    'Vulcan', 'Andoria', 'Risa', '"Shore Leave" planet, Omicron Delta region', 'Nibiru',
    'Wolf 359', 'Eminar VII', 'Remus', 'Janus VI', 'Earth'
  ];

  return class extends SimpleParticle {

    /**
     * @inheritDoc
     * Given a random value compute the Stardate and Destination.
     */
    update({randomTime, randomPlanet}) {
      if (randomTime && randomPlanet) {
        const {stardate, destination} = this._computeStardate(randomTime.next, randomPlanet.next);

        this.set('stardate', {date: stardate});
        this.set('destination', {name: destination});
      }
    }

    /**
     * @private
     * Aims to follow logic per https://en.wikipedia.org/wiki/Stardate#The_Original_Series_era
     * Calculates a random date/time to allow for speculative execution
     *
     * @param {Number} randomTime value between 0 and 1 used to randomize the date..
     * @param {Number} randomPlanet value between 0 and 1 used to randomize the planet.
     */
    _computeStardate(randomTime, randomPlanet) {
      // TODO(wkorman): Intent was to keep track of the "last stardate" within
      // an arc and use that as the initial prefix. However, we need to find
      // a way to do this that doesn't break with SpecEx, so for now it's a
      // new date every time.

      const prefix = MIN_STARDATE;
      const remainder = MAX_STARDATE - prefix;

      const stardate = prefix + Math.floor(randomTime * remainder);
      const intraday = Math.trunc((new Date().getHours() / 24) * 10);
      const destination = PLANETS[Math.floor(randomPlanet * (PLANETS.length - 1))];
      return {
        stardate: `${stardate}.${intraday}`,
        destination
      };
    }
  };
});
