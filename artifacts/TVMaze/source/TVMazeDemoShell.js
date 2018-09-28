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
          padding: 8px;
        }
      </style>
      <div banner>My Shows</div>
      <div slotid="shows"></div>
      <div banner>Recommendations</div>
      <div slotid="recommended"></div>
      <div banner>Find Shows</div>
      <div slotid="searchbar"></div>
      <div slotid="search"></div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({user, boxed, display, recommended}) {
      if (user && boxed && display) {
        const myShows = this.boxQuery(boxed, user.id);
        this.clearHandle('display');
        this.appendRawDataToHandle('display', myShows);
      }
    }
    render({}, {}) {
    }
    async onHandleUpdate(handle, update) {
      log(handle, update);
      await this._handlesToProps();
    }
  };
});