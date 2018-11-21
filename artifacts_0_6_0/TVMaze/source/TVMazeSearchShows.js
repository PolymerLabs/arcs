// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle, importScripts */
defineParticle(({DomParticle, _fetch, resolver, log}) => {

  const service = `https://api.tvmaze.com`;
  /* global service */
  //importScripts(resolver('TVMazeSearchShows/TvMaze.js'));

  return class extends DomParticle {
    get template() {
      return '&nbsp;'; //html`Searching`;
    }
    update({query, shows}, state) {
      // If we are asynchronously populating data, wait until this is done before
      // handling additional updates.
      if (!state.receiving) {
        if (query && query.query && query.query !== state.query) {
          state.receiving = true;
          state.query = query.query;
          log('fetching for query', query.query);
          this.fetchShows(query, shows);
        }
      }
    }
    async fetchShows(query, shows) {
      const response = await _fetch(`${service}/search/shows?q=${query.query}`);
      const data = await response.json();
      this.receiveShows(data, shows);
      this.setState({receiving: false});
    }
    async receiveShows(data, shows) {
      log('receiveShows', data);
      // chuck old data
      await this.clearHandle('shows');
      // filter out shows with no medium image
      const filter = ({show}) => show.image && show.image.medium;
      // remap fields to our entity schema
      const map = ({show}) => this.showToEntityData(show);
      // add new data
      const rawData = data.filter(filter).map(map);
      await this.appendRawDataToHandle('shows', rawData);
      log('stored these shows:', rawData);
    }
    showToEntityData(show) {
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
