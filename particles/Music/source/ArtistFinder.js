// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle, importScripts */
defineParticle(({DomParticle, log}) => {

  /* global service */
  const service = 'https://kgsearch.googleapis.com/v1/entities:search?key=AIzaSyDVu27xQSI7fQ-_VvZpCH6sdVMe1mueN54&limit=1';

  return class extends DomParticle {
    get template() {
      return '&nbsp;'; //html`Searching`;
    }
    update({find}, state) {
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
      this.setState({receiving: true});
      const response = await fetch(`${service}&query=${encodeURI(find.name)}`);
      const artists = await response.json();
      this.setState({receiving: false});
      this.receiveArtists(artists);
    }
    async receiveArtists(artists) {
      log(artists);
      if (artists.error) {
        console.log(artists.error);
      } else if (artists.itemListElement.length === 0) {
        console.log('No results in the knowledge graph.');
      } else {
        const artist = artists.itemListElement[0].result;
        log(artist);
        this.updateVariable('artist', {
          artistid: artist['@id'],
          type: artist['@type'].join(','),
          name: artist.name,
          description: artist.description,
          imageUrl: artist.image && artist.image.contentUrl,
          detailedDescription: artist.detailedDescription && artist.detailedDescription.articleBody
        });
        this.setParticleDescription(artist.name);
      }
    }
  };
});
