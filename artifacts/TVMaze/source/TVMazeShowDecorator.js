// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, log}) => {
  return class extends DomParticle {
    update({show, boxedShows, boxedUserNames, friends}) {
      let description = `Find shows using TVMaze`;
      if (show && boxedShows && boxedUserNames && friends) {
        const getUserName = id => (this.boxQuery(boxedUserNames, id)[0] || Object).userName || id;
        description = this.buildDescription(show, boxedShows, friends, getUserName);
      }
      this.setParticleDescription(description);
    }
    buildDescription(show, boxedShows, friends, getUserName) {
      const watchers = [];
      friends.forEach(friend => {
        const friendShows = this.boxQuery(boxedShows, friend.id);
        if (friendShows.find(friendShow => friendShow.showid === show.showid)) {
          watchers.push(getUserName(friend.id));
        }
      });
      let alsoWatch = `also watch ${show.name}.`;
      switch (watchers.length) {
        case 0:
          alsoWatch = '';
          break;
        case 1:
          alsoWatch = `. ${watchers[0]} also watches ${show.name}.`;
          break;
        case 2:
          alsoWatch = `. ${watchers[0]} and ${watchers[1]} ${alsoWatch}`;
          break;
        default:
          alsoWatch = `. ${watchers.slice(0, -1).join(', ')}, and ${watchers.pop()} ${alsoWatch}`;
          break;
      }
      return `${show.name} is on ${show.network}${show.time ? ` at ${show.time}` : ''} on ${show.day}${alsoWatch}`;
      //return {
      //  template: `<b>${show.name}</b> is on <b>${show.network}</b> at <b>${show.time}</b> on <b>${show.day}</b>${alsoWatch} <b>${alsoShow}.</b>`,
      //  model: {}
      //};
    }
  };
});
