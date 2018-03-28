/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../../../components/xen/xen.js';

const html = Xen.Template.html;
const template = html`
  <style>
    :host {
      display: flex;
      align-items: center;
      border: 1px solid rgba(90%, 90%, 90%);
      border-radius: 16px;
      background-color: white;
      color: black;
      padding: 12px 13px 11px;
      margin: 6px 0;
      /*line-height: 32px;*/
      cursor: pointer;
      transition: all 150ms;
    }
    :host(:hover) {
      background-color: rgb(96%, 96%, 96%);
      color: black;
    }
    :host > div {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
  <div style="flex: 1;" on-click="_onClick">
    <slot on-mouseover="_onMouseover" on-mouseout="_onMouseout"></slot>
  </div>
`;

class SuggestionElement extends Xen.Base {
  static get observedAttributes() {
    return ['plan'];
  }
  get template() {
    return template;
  }
  _update({plan}, state) {
    if (plan) {
      this.setAttribute('hash', plan.hash);
    }
  }
  _didRender() {
    this.setAttribute('title', this.textContent);
  }
  _onClick() {
    const {plan} = this._props;
    this._fire('plan-choose', plan, this, {bubbles: true});
  }
  _onMouseover() {
    this._hover(true);
  }
  _onMouseout() {
    this._hover(false);
  }
  _hover(selected) {
    const {plan} = this._props;
    this._fire('plan-hover', {hash: plan && plan.hash, selected}, document);
  }
}

customElements.define('suggestion-element', SuggestionElement);

export default SuggestionElement;
