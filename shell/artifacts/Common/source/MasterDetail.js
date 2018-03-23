// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  let host = `master-detail`;

  let template = html`
<style>
  [${host}] > .detail-wrapper {
    position: relative;
  }
  [${host}] > .detail-wrapper > .close-button {
    z-index: 100;
    position: absolute;
    right: 0;
    top: 0;
    padding: 16px;
  }
  button:focus {
    outline:0;
  }
</style>
<div ${host}>
  <div class="detail-wrapper" style%="{{tab0}}">
    <icon trigger="close" class="close-button" on-click="_onBack">close</icon>
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
    render({selected}) {
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
