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
      [playlist-item] {
        padding: 8px 0;
        margin: -1px 0; /* removing the borders from the styling of the List.js */
        background-color: white;
        display: flex;
        height: 60px;
        text-decoration: none;
        color: #000;
        cursor: pointer;
      }
      [playlist-item]:hover {
        background-color: #eee;
      }
      [playlist-item] [img-holder] {
        height: 60px;
        width: 60px;
        background-color: gray;
      }
      [playlist-item] img {
        height: 60px;
      }
      [playlist-item] [info] {
        padding-left: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
      }
      [playlist-item] [description] {
        font-size: 12px;
        color: #666;
        margin: 2px 0;
      }
    </style>
    <a playlist-item target="_blank" href="{{link}}">
      <div img-holder>
        <img src={{thumbnail}}>
      </div>
      <div info>
        <div name>{{name}}</div>
        <div description>{{description}}</div>
      </div>
    </a>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props && props.playlist);
    }
    render({playlist}) {
      return {
        name: playlist.name,
        description: playlist.description,
        thumbnail: playlist.thumbnail,
        link: playlist.link
      };
    }
  };
});
