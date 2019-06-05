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

defineParticle(({DomParticle, html, log}) => {

  const host = `tv-maze-demo-shell`;

  // TODO(sjmiles): encode expected aspect-ratio using div-padding trick, this way the box will be properly sized
  // even if there is no image.
  // The old way: `<img ${host} src="{{image}}" style="width:100%;">`;
  const template = html`
    <div ${host}>
      <style>
        :host {
          min-height: 100vh;
          background-color: #333333;
          color: whitesmoke;
        }
        cx-tabs {
          --cx-tab-slider-color: #ccc;
          border-bottom: 1px solid black;
        }
        [banner] {
          display: flex;
          align-items: center;
          padding-left: 16px;
        }
        [banner][hidden] {
          display: none;
        }
        [banner] icon {
          margin: -2px 0 0 -2px;
        }
        [slotid="search"] {
          --tile-width: 128px;
        }
        [slotid="recommended"] {
          --tile-width: 128px;
        }
        [search] {
          padding-top: 11px;
        }
        [search], [main] {
          display: none;
        }
        [open] {
          display: block;
        }
      </style>
      <cx-tabs on-select="onTabSelect">
        <cx-tab selected>My Shows</cx-tab>
        <cx-tab>Search</cx-tab>
      </cx-tabs>
      <!-- <div banner>Find Shows</div>
      <div banner><icon on-click="toggleSearch">add</icon> Search</div> -->
      <div search open$="{{searchOpen}}">
        <div slotid="searchbar"></div>
        <!-- <div banner hidden="{{emptySearchResults}}">Search Results</div> -->
        <div slotid="search"></div>
      </div>
      <div main open$="{{mainOpen}}">
        <!-- <div banner>My Shows</div> -->
        <div slotid="shows"></div>
        <div banner hidden="{{emptyRecommendations}}">Recommendations</div>
        <div slotid="recommended"></div>
      </div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({user, boxedShows, /*recentShows,*/ boxedUserNames, friends}, state) {
      // if (recentShows) {
      //   const show = recentShows[0];
      //   if (show && (!state.lastShow || show.showid !== state.lastShow.showid)) {
      //     this.updateDescription(show, boxedShows, boxedUserNames, friends);
      //     state.lastShow = show;
      //     log('selecting', show);
      //     this.handles.get('selected').set(show);
      //   }
      // }
      if (user === null) {
        user = {id: 'gomer'};
      }
    }
    render({recentShows}, {tab}) {
      return {
        mainOpen: !tab,
        searchOpen: tab === 1,
        //emptySearchResults: !foundShows || !foundShows.length
        emptyRecommendations: !recentShows || !recentShows.length
      };
    }
    onTabSelect(e) {
      this.setState({tab: e.data.value});
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
        this.updateSingleton('watcherText', {text: alsoWatch});
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
    toggleSearch() {
      this._setState({searchOpen: !this.state.searchOpen});
    }
  };
});
