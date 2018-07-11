// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, resolver, html, log}) => {

  let host = `show-list`;

  const template = html`
<style>
  [${host}] {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    pointer-events: all;
    display: none;
  }
  [${host}][open] {
    display: block;
  }
  [${host}] [scrim] {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    pointer-events: all;
    background-color: gray;
    opacity: 0.5;
  }
  [${host}] [dialog] {
    position: absolute;
    top: 25%;
    right: 25%;
    bottom: 25%;
    left: 25%;
    padding: 16px;
    background-color: white;
    box-shadow: 0px 0px 8px 4px rgba(102,102,102,0.25);
  }
</style>

<div ${host} modal open$="{{open}}" on-click="onOuterClick">
  <div scrim></div>
  <div dialog on-click="onInnerClick">
    <div>I'm a Dialog</div>
    <div slotid="content"></div>
  </div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({uiState}) {
      return {
        open: Boolean(uiState && uiState.open)
      };
    }
    onInnerClick() {
    }
    onOuterClick() {
      this.close();
    }
    close() {
      const handle = this.handles.get('uiState');
      handle.set(new (handle.entityClass)({open: false}));
    }
  };
});