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

  const template = html`
    <style>
      [play-record] {
        padding: 4px 0;
        margin: -1px 0; /* removing the borders from the styling of the List.js */
        background-color: white;
      }
      [play-record] [time] {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }
    </style>
    <div play-record>
      <div>{{song}}</div>
      <div time>Heard <span>{{dateTime}}</span></div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props && props.playRecord);
    }
    render({playRecord}) {
      return {
        song: playRecord.song,
        dateTime: this._formatTime(Number(playRecord.dateTime))
      };
    }
    _formatTime(dateTime) {
      const delta = Date.now() - dateTime;
      if (delta < 60 * 60 * 1000) {
        let minutes =  Math.round(delta / (60 * 1000));
        if (minutes === 0) minutes = 1;
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
      } else if (delta < 24 * 60 * 60 * 1000) {
        const hours =  Math.round(delta / (60 * 60 * 1000));
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      } else {
        return `on ${new Date(Number(dateTime)).toLocaleDateString()}`;
      }
    }
  };
});
