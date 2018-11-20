// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle, importScripts */

defineParticle(({DomParticle, resolver, html}) => {

  const host = 'tv-maze-search-bar';

  const template = html`
<div ${host}>
  <style>
    body {
      --shell-bg: #333333;
      --shell-color: whitesmoke;
      --tiles-bg: #333333;
      --tiles-color: whitesmoke;
    }
    [${host}] > [search] {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background-color: var(--tiles-bg);
      color: var(--tiles-color);
    }
    [${host}] > [search] > input {
      flex: 1;
      font-size: 1.2em;
      padding: 7px 16px;
      margin: 0 8px;
      border-radius: 16px;
      border: none;
      outline: none;
    }
  </style>
  <div search>
    <icon trigger="find show" on-click="onSearchTrigger">search</icon>
    <input placeholder="TV Show Search" on-change="onChange" value="{{searchText}}">
    <speech-input on-result="onResult" on-end="onEnd"></speech-input>
  </div>
</div>

  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    onResult(e) {
      const searchText = e.data.value;
      this._setState({searchText});
    }
    onEnd(e) {
      const searchText = e.data.value;
      this._setState({searchText});
      this.commit(searchText);
    }
    onSearchTrigger(e) {
      const searchText = e.data.value;
      this._setState({searchText});
      this.commit(searchText);
    }
    onChange(e) {
      this.commit(e.data.value);
    }
    commit(text) {
      this.updateVariable('query', {query: text || ''});
    }
    render(props, state) {
      return state;
    }
  };

});
