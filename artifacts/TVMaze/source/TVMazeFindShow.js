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

  /* global service */
  //importScripts(resolver('TVMazeFindShow/TvMaze.js'));
  const service = `https://api.tvmaze.com`;

  return class extends DomParticle {
    get template() {
      return '&nbsp;'; //html`Searching`;
    }
    update({find}, state) {
      // If we are asynchronously populating data, wait until this is done before
      // handling additional updates.
      if (!state.receiving) {
        if (find) {
          if (find.length) {
            find = find[0];
          }
          if (find && find !== state.find) {
            state.find = find;
            this.fetchShow(find);
          }
        }
      }
    }
    async fetchShow(find) {
      this.setState({receiving: true});
      const response = await _fetch(`${service}/search/shows?q=${find.name}`);
      const shows = await response.json();
      if (shows && shows.length) {
        this.receiveShow(shows[0]);
      }
      this.setState({receiving: false});
    }
    async receiveShow({show}) {
      //log(show);
      if (show.image && show.image.medium) {
        this.updateVariable('show', {
          showid: String(show.id),
          name: show.name,
          description: show.summary,
          image: show.image && show.image.medium.replace('http:', 'https:') || '',
          network: show.network && show.network.name || show.webChannel && show.webChannel.name || '',
          day: show.schedule && show.schedule.days && show.schedule.days.shift() || '',
          time: show.schedule && show.schedule.time
        });
      }
    }
  };
});
