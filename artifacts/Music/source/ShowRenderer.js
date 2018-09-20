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
      [show-item] {
        padding: 8px 0;
        margin: -1px 0; /* removing the borders from the styling of the List.js */
        background-color: white;
        display: flex;
        height: 80px;
      }
      [show-item] [img-holder] {
        height: 80px;
        width: 120px;
        background-color: gray;
      }
      [show-item] img {
        height: 80px;
      }
      [show-item] [info] {
        padding-left: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
      }
      [show-item] [date], [show-item] [venue] {
        font-size: 12px;
        color: #666;
        margin: 2px 0;
      }
    </style>
    <div show-item>
      <div img-holder>
        <img src={{imageUrl}}>
      </div>
      <div info>
        <div name>{{name}}</div>
        <div date>{{date}}</div>
        <div venue>{{venue}}</div>
      </div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props && props.show);
    }
    render({show}) {
      return {
        name: show.name,
        date: show.date,
        time: show.time,
        venue: show.venue,
        imageUrl: show.imageUrl
      };
    }
  };
});
