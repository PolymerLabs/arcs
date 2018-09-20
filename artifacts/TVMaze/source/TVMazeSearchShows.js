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
    update({query}, state) {
      // If we are asynchronously populating data, wait until this is done before
      // handling additional updates.
      if (!state.receiving && query) {
        if (query !== state.query) {
          state.query = query;
          this.fetchShows(query);
        }
      }
    }
    async fetchShows(query) {
      this.setState({count: -1, receiving: true});
      const response = await fetch(`${service}/search/shows?q=${query.query}`);
      const shows = await response.json();
      this.receiveShows(shows);
      this.setState({receiving: false});
    }
    async receiveShows(shows) {
      //log('TVShows', shows);
      const showsView = this.handles.get('shows');
      // clear old data
      //let entities = await showsView.toList();
      //entities.forEach(e => showsView.remove(e));
      // add new data
      const Show = showsView.entityClass;
      shows.forEach(show => {
        show = show.show;
        if (show.image && show.image.medium) {
          let entity = new Show({
            showid: String(show.id),
            name: show.name,
            description: show.summary,
            image: show.image && show.image.medium.replace('http:', 'https:') || '',
            network: show.network && show.network.name || show.webChannel && show.webChannel.name || '',
            day: show.schedule && show.schedule.days && show.schedule.days.shift() || '',
            time: show.schedule && show.schedule.time
          });
          //log('TVShows', JSON.stringify(entity.dataClone(), null, '  '));
          showsView.store(entity);
        }
      });
    }
  };
});
