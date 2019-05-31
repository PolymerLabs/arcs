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

/* global defineParticle, importScripts */
defineParticle(({DomParticle, log}) => {

  /* global service */
  const service = 'https://kgsearch.googleapis.com/v1/entities:search?key=AIzaSyDVu27xQSI7fQ-_VvZpCH6sdVMe1mueN54&limit=1';

  return class extends DomParticle {
    get template() {
      return '&nbsp;';
    }
    shouldRender({find}) {
      return Boolean(find);
    }
    update({find}, state) {
      //log('updating, find =', find);
      // TODO(sjmiles): waiting until `find` is valued is too late to protect
      // the Particle from SpecEx tear-down, and so it doesn't have time to
      // setParticleDescription (which is valuable for contentful suggestion).
      // As a workaround, we startBusy right away, and use a timeout to be
      // doneBusy if `find` does not become valued in the interim.
      // if (!state.busyStarted) {
      //   state.busyStarted = true;
      //   // keep alive until we can produce decorated suggestion (or we timeout)
      //   this.startBusy();
      //   //log('startBusy ... will timeout in 500ms');
      //   state.busyTimeout = setTimeout(() => {
      //     this.doneBusy();
      //   }, 500);
      // }
      // If we are asynchronously populating data, wait until this is done before
      // handling additional updates.
      if (find && !state.receiving) {
        if (find.length) {
          find = find[0];
        }
        if (find && find !== state.find) {
          state.find = find;
          this.fetchArtist(find);
        }
      }
    }
    async fetchArtist(find) {
      //clearTimeout(this.state.busyTimeout);
      this.startBusy();
      this.setState({receiving: true});
      try {
        //log('startBusy', this.busy);
        const response = await fetch(`${service}&query=${encodeURI(find.name)}`);
        const artists = await response.json();
        this.receiveArtists(artists);
        //log('doneBusy');
      } finally {
        this.setState({receiving: false});
        this.doneBusy();
      }
    }
    async receiveArtists(artists) {
      log(artists);
      if (artists.error) {
        log(artists.error);
      } else if (artists.itemListElement.length === 0) {
        log('No results in the knowledge graph.');
      } else {
        const artist = artists.itemListElement[0].result;
        log(artist);
        this.updateSingleton('artist', {
          artistid: artist['@id'],
          type: artist['@type'].join(','),
          name: artist.name,
          description: artist.description,
          imageUrl: artist.image && artist.image.contentUrl,
          detailedDescription: artist.detailedDescription && artist.detailedDescription.articleBody
        });
        const description = `${artist.name}: ${artist.description}`;
        log(`setting particle description to [${description}]`);
        this.setParticleDescription('artist', description);
      }
    }
  };
});
