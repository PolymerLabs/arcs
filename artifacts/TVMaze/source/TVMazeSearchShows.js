// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle, importScripts */
defineParticle(({DomParticle, html, resolver, log}) => {

  importScripts(resolver('TVMazeSearchShows/TvMaze.js'));
  /* global service */

  return class extends DomParticle {
    get template() {
      return '&nbsp;'; //html`Searching`;
    }
    update({query, shows}, state) {
      // If we are asynchronously populating data, wait until this is done before
      // handling additional updates.
      if (!state.receiving) {
        if (query && query.query !== state.query) {
          state.query = query.query;
          this.fetchShows(query, shows);
        }
      }
    }
    async fetchShows(query, shows) {
      this.setState({count: -1, receiving: true});
      const response = await fetch(`${service}/search/shows?q=${query.query}`);
      const data = await response.json();
      this.receiveShows(data, shows);
      this.setState({receiving: false});
    }
    async receiveShows(data, shows) {
      //log('TVShows', shows);
      // add new data
      data = data.filter(({show}) => show.image && show.image.medium && (!shows || !shows.find(s => show.id == s.showid)));
      const rawData = data.map(({show}) => this.showToEntity(show));
      //await this.clearHandle('shows');
      await this.appendRawDataToHandle('shows', rawData);
    }
    showToEntity(show) {
      return {
        showid: String(show.id),
        name: show.name,
        description: show.summary,
        image: show.image && show.image.medium.replace('http:', 'https:') || '',
        network: show.network && show.network.name || show.webChannel && show.webChannel.name || '',
        day: show.schedule && show.schedule.days && show.schedule.days.shift() || '',
        time: show.schedule && show.schedule.time
      };
    }
  };
});
