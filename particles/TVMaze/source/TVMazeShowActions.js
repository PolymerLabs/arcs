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
          color: white;
          padding-left: 4px;
        }
      </style>
      <div bar>
        <icon key="{{showid}}" on-click="onFavorite">{{favorite}}</icon>
      </div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({show}, state) {
      if (show) {
        if (!('favorite' in state)) {
          state.favorite = show.favorite;
        }
        return {
          showid: show.id,
          favorite: state.favorite ? `favorite` : `favorite_border`
        };
      }
    }
    onFavorite() {
      const {show} = this._props;
      if (show) {
        this._setState({favorite: true});
        this.updateSet('shows', show);
      }
    }
  };

});
