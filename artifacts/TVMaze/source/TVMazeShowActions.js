// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, html}) => {

  const host = `tvmaze-show-actions`;

  const template = html`
    <div ${host}>
      <style>
        [${host}] {
          height: 0;
          transform: translate(0, -32px);
        }
        [${host}] [bar] {
          padding: 4px;
          background-color: rgba(0, 0, 0, 0.3);
          position: relative;
          display: flex;
          justify-content: flex-end;
        }
        [${host}] icon {
          padding-left: 4px;
          /*text-shadow: 0px 0px 6px black;*/
        }
      </style>
      <div bar>
        <icon>{{favorite}}</icon>
        <icon on-click="onDelete">delete</icon>
      </div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({show, shows}) {
      if (show) {
        if (shows && Math.random() < 0.5) {
          const original = shows.find(s => s.showid === show.showid);
          if (original) {
            original.favorite = !original.favorite;
            this.updateSet('shows', original);
          }
        }
        return {
          favorite: show.favorite ? `favorite` : `favorite_border`
        };
      }
    }
    onDelete() {
      const {show, shows} = this._props;
      if (show && shows) {
        console.log('DELETE', show.rawData);
      }
    }
  };
});