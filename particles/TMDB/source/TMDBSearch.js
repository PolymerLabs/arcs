/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */
defineParticle(({SimpleParticle, log}) => {

  const service = `http://xenonjs.com/services/http/php/tmdb.php`;

  return class extends SimpleParticle {
    update({query}, state) {
      // If we are asynchronously populating data, wait until this is done before
      // handling additional updates.
      if (!state.receiving) {
        if (query && query.query && query.query !== state.query) {
          state.receiving = true;
          state.query = query.query;
          log('fetching for query', query.query);
          this.fetchResults(query, 'results');
        }
      }
    }
    async fetchResults(query, resultsHandleName) {
      const response = await fetch(`${service}/?query=search/multi/?query=${query.query}`);
      try {
        const data = await response.json();
        log('fetchResults', data);
        if (data.results) {
          this.receiveResults(data.results, resultsHandleName);
        }
      } finally {
        this.setState({receiving: false});
      }
    }
    async receiveResults(results, resultsHandleName) {
      log('receiveResults', results);
      // chuck old data
      await this.clearHandle(resultsHandleName);
      // support filtering
      const filter = result => result.poster_path;
      // support mapping fields to our entity schema
      const map = result => this.resultToEntity(result);
      // construct entity data
      const rawData = results.filter(filter).map(map);
      // store new data
      await this.appendRawDataToHandle(resultsHandleName, rawData);
      log('stored this entity data:', rawData);
    }
    resultToEntity({id, name, title, media_type, adult, overview, backdrop_path, poster_path}) {
      return {
        id: `${id}`,
        name: name || title,
        media_type,
        adult,
        backdrop_path,
        poster_path,
        overview
      };
    }
  };
});
