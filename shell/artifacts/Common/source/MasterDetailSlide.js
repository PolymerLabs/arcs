// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, html, log}) => {

  let host = `master-detail`;

  let template = html`
<style>
  [${host}] {
    position: relative;
  }
  [${host}] [empty] {
    display: none;
  }
  [${host}] [detail-panel] {
    position: sticky;
    top: 64px;
    height: 0;
    box-sizing: border-box;
  }
  [${host}] [abs-panel] {
    position: absolute;
    top: 56px;
    right: 0;
    left: 0;
    height: calc(100vh - 168px);
    border-radius: 16px;
    padding: 0 16px;
    box-sizing: border-box;
    background-color: white;
    box-shadow: 0px 0px 6px 2px rgba(252,252,252,0.65);
    overflow-y: auto;
    transform: translate3d(0, 100vh, 0);
    transition: transform 100ms ease-out;
  }
  [${host}] [abs-panel][open] {
    transform: translate3d(0, 0, 0);
  }
  [${host}] [abs-panel][hide] {
    height: 0;
  }
  [${host}] button {
    background-color: transparent;
    border: none;
    position: absolute;
    right: 24px;
    top: 10px;
  }
</style>
<div ${host}>
  <!--
    CSS tricks: zero-height position:sticky panel can autosize horizontally while not scrolling and not
    pushing siblings out of position. Contained absolute panel can have vertical size without affecting
    outer flow.
  -->
  <div detail-panel>
    <div abs-panel open$="{{open}}" hide$="{{hide}}">
      <button on-click="_onBack" class="material-icons">close</button>
      <div slotid="detail"></div>
    </div>
  </div>
  <div master-panel style="{{master}}">
    <div slotid="master"></div>
  </div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render({selected}, state) {
      let hide = true;
      const open = Boolean(selected && (selected.name || selected.id));
      if (open || state.open) {
        // we are or were open, so don't hide right away
        hide = false;
      }
      if (!open && state.open) {
        // about to close, wait for animation before hiding
        // state.open will be false next update (note: an update may occur before the timeout)
        setTimeout(() => this._setState(), 400);
      }
      // record new open state
      state.open = open;
      return {hide, open};
    }
    _onBack() {
      // remove selection
      this._views.get('selected').clear();
    }
  };

});
