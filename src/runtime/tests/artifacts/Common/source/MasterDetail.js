/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, html}) => {

  const host = `master-detail`;

  const template = html`
<style>
  [${host}] > .detail-wrapper {
    position: relative;
  }
  @media (min-width: 640px) {
    [${host}] > .detail-wrapper {
      position: relative;
      max-width: 480px;
      margin: 16px auto;
      box-shadow: 0px 1px 2px rgba(0,0,0,.2);
      padding-bottom: 25%;
    }
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
`;

  return class extends UiParticle {
    get template() {
      return template;
    }
    render({selected}) {
      const hasSelection = selected && (selected.name || selected.id);
      return {
        tab0: {display: hasSelection ? '' : 'none'},
        tab1: {display: hasSelection ? 'none' : ''}
      };
    }
    _onBack() {
      this.handles.get('selected').clear();
    }
  };

});
