// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, html, log}) => {

  const host = `tv-maze-demo-shell`;

  // TODO(sjmiles): encode expected aspect-ratio using div-padding trick, this way the box will be properly sized
  // even if there is no image.
  // The old way: `<img ${host} src="{{image}}" style="width:100%;">`;
  const template = html`
    <div ${host}>
      <style>
        [${host}] [banner] {
          padding: 8px 16px;
        }
        [${host}] [slotid="search"] [card] {
          width: 128px !important;
        }
        [${host}] [slotid="shows"] [card] {
          width: 224px !important;
        }
        [${host}] [slotid="recommended"] [card] {
          width: 128px !important;
        }
      </style>
      <!-- <div banner>Find Shows</div> -->
      <div slotid="searchbar"></div>
      <div banner>Search Results</div>
      <div slotid="search"></div>
      <div banner>My Shows</div>
      <div slotid="shows"></div>
      <div banner>Recommendations</div>
      <div slotid="recommended"></div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({user, boxed, display, recentShows}, state) {
      if (recentShows) {
        const show = recentShows[0];
        if (show && (!state.lastShow || show.showid !== state.lastShow.showid)) {
          state.lastShow = show;
          log('selecting', show);
          this.handles.get('selected').set(show);
        }
      }
      if (user && boxed) {
        this.findMyBoxedShows(user, boxed, display, this.handles.get('display'));
      }
    }
    findMyBoxedShows(user, boxed, display, output) {
      // (1) filter out shows not shared by me from the boxed shows
      const myShows = this.boxQuery(boxed, user.id);
      // (2) update display to match myShows with minimal change events
      const toDelete = [];
      const toAdd = {};
      // build a map of wanted shows by id
      myShows.forEach(show => toAdd[show.id] = show);
      // for existing shows,
      display.forEach(show => {
        if (toAdd[show.id]) {
          // if the show is already in display, do nothing
          toAdd[show.id] = null;
        } else {
          // if this show is not part of myShows, remove it
          toDelete.push(show);
        }
      });
      // remove old shows
      toDelete.forEach(show => output.remove(show));
      // add new shows
      Object.values(toAdd).forEach(show => show && output.store(show));
    }
  };
});
