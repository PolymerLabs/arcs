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
      padding: 6px 16px 4px 16px;
      margin: 6px;
      line-height: 20px;
      font-size: 14px;
      letter-spacing: 0.25px;
      border: 1px solid #E6E6E6;
      border-radius: 16px;
      background-color: white;
      color: black;
      cursor: pointer;
      transition: all 150ms;
    }
    :host(:hover) {
      background-color: #E6E6E6;
      color: black;
    }
    :host > div {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: var(--suggestion-wrap);
      /*white-space: normal;*/
    }
  </style>

  <div on-click="_onClick">
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
