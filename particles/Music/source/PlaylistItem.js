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

defineParticle(({UiParticle, html}) => {

  const host = `playlist-item`;

  const template = html`
    <style>
      [${host}] {
        padding: 8px 0;
        background-color: white;
        display: flex;
        height: 60px;
        text-decoration: none;
        color: #000;
        cursor: pointer;
      }
      [${host}]:hover {
        background-color: #eee;
      }
      [${host}] [img-holder] {
        height: 60px;
        width: 60px;
        background-color: gray;
      }
      [${host}] img {
        height: 60px;
      }
      [${host}] [info] {
        padding-left: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
      }
      [${host}] [description] {
        font-size: 12px;
        color: #666;
        margin: 2px 0;
      }
    </style>
    <a ${host} target="_blank" href="{{link}}">
      <div img-holder>
        <img src={{thumbnail}}>
      </div>
      <div info>
        <div name>{{name}}</div>
        <div description>{{description}}</div>
      </div>
    </a>
  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender({playlist}) {
      return Boolean(playlist);
    }
    render({playlist}) {
      return Object.assign({
          // TODO(sjmiles): subid required by renderer, not used in template (iirc, verify!)
          subid: this.idFor(playlist)
        },
        this.dataClone(playlist)
      );
    }
  };
});
