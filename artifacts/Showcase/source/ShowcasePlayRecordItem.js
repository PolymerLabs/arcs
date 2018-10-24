/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html}) => {

  const host = 'play-record';

  const template = html`
    <div ${host}>
    <style>
      [${host}] {
        padding: 4px 0;
        margin: -1px 0; /* removing the borders from the styling of the List.js */
        background-color: white;
      }
      [${host}] [time] {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }
    </style>
      <div><i>{{song}}</i> from <b>{{artist}}</b></div>
      <div time>Heard on <span>{{dateString}}</span></div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    getPlayRecord() {
      const {playRecord} = this._props;
      if (Array.isArray(playRecord)) {
        return playRecord[0];
      }
      return playRecord;
    }
    shouldRender({playRecord}) {
      return Boolean(this.getPlayRecord());
    }
    render() {
      const {song, artist, dateTime} = this.getPlayRecord();
      const dateString = new Date(dateTime).toLocaleDateString();
      this.setParticleDescription(`You listened to <b>${song}</b> from <b>${artist}</b> at ${dateString}`);
      return {
        song,
        artist,
        dateString
      };
    }
  };
});
