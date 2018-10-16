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
      <div banner hidden="{{emptySearchResults}}">Search Results</div>
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
    update({user, boxedShows, display, recentShows, boxedUserNames, friends}, state) {
      if (recentShows) {
        const show = recentShows[0];
        if (show && (!state.lastShow || show.showid !== state.lastShow.showid)) {
          this.updateDescription(show, boxedShows, boxedUserNames, friends);
          state.lastShow = show;
          log('selecting', show);
          this.handles.get('selected').set(show);
        }
      }
      if (user && boxedShows) {
        this.findMyBoxedShows(user, boxedShows, display, this.handles.get('display'));
      }
    }
    render({foundShows}) {
      return {
        emptySearchResults: !foundShows || !foundShows.length
      };
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
    updateDescription(show, boxedShows, boxedUserNames, friends) {
      log(show, boxedShows, boxedUserNames, friends);
      if (show && boxedShows && boxedUserNames && friends) {
        //
        const getUserName = id => (this.boxQuery(boxedUserNames, id)[0] || Object).userName || id;
        //
        const watchers = [];
        friends.forEach(friend => {
          const friendShows = this.boxQuery(boxedShows, friend.id);
          if (friendShows.find(friendShow => friendShow.showid === show.showid)) {
            watchers.push({
              id: friend.id,
              name: getUserName(friend.id)
            });
          }
        });
        //log(watchers);
        //this.clearHandle('watchers');
        //this.appendRawDataToHandle('watchers', watchers);
        //
        const alsoWatch = watchers && show ? this.buildDescription(watchers, show) : '';
        log(alsoWatch);
        this.updateVariable('watcherText', {text: alsoWatch});
        //
        let description = '';
        if (watchers && show) {
          description = `${show.name} is on ${show.network}${show.time ? ` at ${show.time}` : ''}${show.day ? ` on ${show.day}` : ''}${description ? `. ${description}` : ''}.`;
        }
        description += ` ${alsoWatch.replace(/<b>|<\/b>/g, '')}`;
        log('description', description);
        this.setParticleDescription(description);
        //this.setParticleDescription({template: description, model: {}});
      }
    }
    buildDescription(watchers, show) {
      let alsoWatch = `also watch <b>${show.name}</b>.`;
      switch (watchers.length) {
        case 0:
          alsoWatch = '';
          break;
        case 1:
          alsoWatch = `<b>${watchers[0].name}</b> also watches <b>${show.name}</b>.`;
          break;
        case 2:
          alsoWatch = `<b>${watchers[0].name}</b> and <b>${watchers[1]}</b> ${alsoWatch}`;
          break;
        default:
          alsoWatch = `<b>${watchers.slice(0, -1).map(w => w.name).join('</b>, <b>')}</b>, and <b>${watchers.pop().name}</b> ${alsoWatch}`;
          break;
      }
      return alsoWatch;
    }
  };
});
