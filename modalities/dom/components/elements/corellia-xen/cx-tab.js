/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../../xen/xen.js';

const html = Xen.Template.html;
const template = html`

<style>
  :host {
    position: relative;
    display: inline-block;
    padding: 15px 24px 13px 24px;
    cursor: pointer;
    user-select: none;
    background-color: transparent;
  }
  :host(:focus) {
    outline: none;
    background-color: rgba(192, 192, 255, 0.35);
  }
  #selectionBar {
    pointer-events: none;
    display: var(--cx-tab-bar-display, block);
    position: absolute;
    top: 0px;
    right: 0px;
    bottom: 0px;
    left: 0px;
    border-width: var(--cx-tab-slider-width, 0px 0px 1px 0px);
    border-style: var(--cx-tab-slider-style, solid);
    border-color: var(--cx-tab-slider-color, blue);
    margin-bottom: -1px;
  }
  :host(:not([selected])) #selectionBar {
    display: none;
  }
</style>
<slot></slot>
<div id="selectionBar"></div>
`;

class CorelliaXenTab extends Xen.Base {
  static get observedAttributes() {
    return ['selected'];
  }
  get template() {
    return template;
  }
  _didMount() {
    this.addEventListener('click', this._onSelectedClick.bind(this));
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'tab');
    // TODO(sjmiles): have to wait until the owner is listening ... no deterministic answer? sadness
    this._async(() => {
      this._fire('tab-connect', null, this, {bubbles: true});
    });
  }
  _setProperty(name, value) {
    if (name === 'selected') {
      value = Boolean(value || value === '');
    }
    super._setProperty(name, value);
  }
  _render({selected}, state) {
  }
  _didRender({selected}, state) {
    Xen.setBoolAttribute(this, 'selected', Boolean(selected));
  }
  _onSelectedClick() {
    this._fire('tab-select', true, this, {bubbles: true});
  }
}
customElements.define('cx-tab', CorelliaXenTab);
