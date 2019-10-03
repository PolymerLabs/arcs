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

defineParticle(({SimpleParticle, resolver, html}) => {

  const template = html`
<style>
  [search] {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    color: var(--input-color, #333333);
    background-color: var(--slug-color, whitesmoke);
  }
  input {
    flex: 1;
    font-size: 1.2em;
    padding: 7px 16px;
    margin: 0 8px;
    border-radius: 16px;
    border: none;
    outline: none;
    background-color: var(--input-bg, white);
  }
</style>

<div search>
  <icon trigger="find show" on-click="onSearchTrigger">search</icon>
  <input placeholder="Search" on-change="onChange" value="{{searchText}}">
  <speech-input on-result="onResult" on-end="onEnd"></speech-input>
</div>

  `;

  return class extends SimpleParticle {
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
      this.updateSingleton('query', {query: text || ''});
    }
    render(props, state) {
      return state;
    }
  };

});
