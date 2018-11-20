// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, resolver, html, log}) => {

  const template = html`

<style>
  [detail-slider] {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    pointer-events: all;
    transform: translate3d(0, 100vh, 0);
  }
  [detail-slider][open] {
    transform: translate3d(0, 0, 0);
  }
  [scrim] {
    position: absolute;
    top: 0;
    right: 0;
    bottom: -64px;
    left: 0;
    pointer-events: all;
    background-color: var(--shell-bg, gray);
    opacity: 0.0;
    transition: opacity 200ms ease-out;
  }
  [open] > [scrim] {
    opacity: 0.8;
  }
  [open] > [modal] {
    transform: translate3d(0, 0, 0);
  }
  [modal] {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: white;
    box-shadow: 0 0 8px 4px rgba(102,102,102,0.25);
    border-radius: 16px;
    transform: translate3d(0, 100vh, 0);
    transition: transform 200ms ease-out;
  }
  @media(min-width: 600px) {
    [modal] {
      max-width: 480px;
      margin: 16px auto 32px;
    }
  }
  [modal] > [buttons] {
    padding: 8px 4px 4px 8px;
  }
  [modal] > [buttons] > [back-button] {
    background-color: transparent;
    border: none;
    border-radius: 100%;
  }
  [modal] > [buttons] > [back-button]:active {
    background-color: #b0e3ff;
  }
  [modal] > [slot-content] {
    flex: 1;
    display: flex;
    overflow: auto;
    padding-bottom: 16px;
  }
  [modal] > [slot-content] > [particle-host] {
    flex: 1;
    display: flex;
  }
</style>

<div detail-slider open$="{{open}}">
  <div scrim></div>
  <div modal>
    <div buttons>
      <icon trigger="close" back-button on-click="onBack">close</icon>
    </div>
    <div slot-content slotid="content"></div>
  </div>
</div>

`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({selected}, {open}) {
      return Boolean(selected || open);
    }
    render({selected}, state) {
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
    onBack() {
      // remove selection
      this.handles.get('selected').clear();
    }
  };
});
