// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let host = `master-detail`;

  let template = `
<style>
  [${host}] .x-button {
    display: inline-flex;
    align-items: center;
    position: relative;
    padding: 10px 16px;
    border-radius: 3px;
    -webkit-appearance: none;
    background-color: #4285f4;
    color: #fff;
    border: 0;
    outline: none;
  }
  [${host}] .x-button:disabled {
    opacity: 0.3;
  }
  [${host}] .x-button.raised {
    transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0.2s;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
  }
  [${host}] .x-button.raised:active:not(:disabled) {
    box-shadow: 0 8px 17px 0 rgba(0, 0, 0, 0.2);
    transition-delay: 0s;
  }
</style>
<div ${host} style="border: 1px solid silver;">
  <div style%="{{tab0}}">
    <div style="padding: 6px"><button class="x-button raised" on-click="_onBack">BACK</button></div>
    <div slotid="detail"></div>
  </div>
  <div style%="{{tab1}}">
    <div slotid="master"></div>
  </div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render({selected}) {
      let hasSelection = selected && (selected.name || selected.id);
      return {
        tab0: {display: hasSelection ? '' : 'none'},
        tab1: {display: hasSelection ? 'none' : ''}
      };
    }
    _onBack() {
      this._views.get('selected').clear();
    }
  };

});
