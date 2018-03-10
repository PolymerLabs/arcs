// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

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
    color: white;
    outline: none;
  }
  [${host}] .x-button:disabled {
    opacity: 0.3;
  }
  [${host}] .x-button.raised {
    // transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    // transition-delay: 0.2s;

  }
  [${host}] .x-button.raised:active:not(:disabled) {
    // box-shadow: 0 8px 17px 0 rgba(0, 0, 0, 0.2);
    // transition-delay: 0s;
  }
  [${host}] .detail-wrapper {
    position: relative;
  }
  [${host}] .close-button {
    z-index: 100;
    position: absolute;
    right: 0;
    top: 0;
  }
  button:focus {
    outline:0;
  }
</style>
<div ${host}>
  <div class="detail-wrapper" style%="{{tab0}}">
    <button on-click="_onBack" class="close-button material-icons">close</button>
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
