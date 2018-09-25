// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle, importScripts */

defineParticle(({DomParticle, resolver, html}) => {

  /* global service */
  importScripts(resolver('TVMazeSearchBar/TvMaze.js'));

  const host = 'tv-maze-search-bar';

  const template = html`
<div ${host}>
  <style>
    body {
      --shell-bg: #333333;
      --shell-color: whitesmoke;
      --tiles-bg: #333333;
      --tiles-color: whitesmoke;
    }
    [${host}] > [search] {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background-color: var(--tiles-bg);
      color: var(--tiles-color);
    }
    [${host}] > [search] > input {
      flex: 1;
      font-size: 1.2em;
      padding: 7px 16px;
      margin: 0 8px;
      border-radius: 16px;
      border: none;
      outline: none;
    }
  </style>
  <div search>
    <icon trigger="find show" on-click="onSearchTrigger">search</icon>
    <input placeholder="TV Show Search" on-change="onChange" value="{{searchText}}">
    <speech-input on-result="onResult" on-end="onEnd"></speech-input>
  </div>
</div>

  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    onResult(e) {
      const searchText = e.data.value;
      this._setState({searchText});
    }
    onEnd(e) {
      const searchText = e.data.value;
      this._setState({searchText});
      this.commit(searchText);
    }
    onSearchTrigger(e) {
      const searchText = e.data.value;
      this._setState({searchText});
      this.commit(searchText);
    }
    onChange(e) {
      this.commit(e.data.value);
    }
    commit(text) {
      this.updateVariable('query', {query: text || ''});
      //this.setState({query: text || '', count: 0});
    }
    // update(props, state) {
    //   if (props.shows && state.query && !state.count) {
    //     this.fetchShows(state.query);
    //   }
    // }
    render(props, state) {
      return state;
    }
    // async fetchShows(query) {
    //   this.setState({count: -1});
    //   let response = await fetch(`${service}/search/shows?q=${query}`);
    //   let shows = await response.json();
    //   this.receiveShows(shows);
    // }
    // async receiveShows(shows) {
    //   console.log('TVShows', shows);
    //   let showsView = this.handles.get('shows');
    //   // clear old data
    //   //let entities = await showsView.toList();
    //   //entities.forEach(e => showsView.remove(e));
    //   // add new data
    //   let Show = showsView.entityClass;
    //   shows.forEach(show => {
    //     show = show.show;
    //     if (show.image && show.image.medium) {
    //       let entity = new Show({
    //         showid: String(show.id),
    //         name: show.name,
    //         description: show.summary,
    //         image: show.image && show.image.medium.replace('http:', 'https:') || '',
    //         network: show.network && show.network.name || show.webChannel && show.webChannel.name || '',
    //         day: show.schedule && show.schedule.days && show.schedule.days.shift() || '',
    //         time: show.schedule && show.schedule.time
    //       });
    //       //console.log('TVShows', JSON.stringify(entity.dataClone(), null, '  '));
    //       showsView.store(entity);
    //     }
    //   });
    // }
  };
  
});
