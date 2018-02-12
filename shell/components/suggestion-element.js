/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from './xen/xen.js';

const template = Xen.Template.createTemplate(
  `<style>
    :host {
      display: block;
      border-radius: 16px;
      background-color: rgb(222, 222, 222);
      color: black;
      padding: 16px;
      margin: 8px 16px;
      cursor: pointer;
    }
    :host(:hover) {
      background-color: rgb(221, 221, 255);
      color: black;
    }
  </style>
  <slot></slot>`
);

class SuggestionElement extends HTMLElement {
  connectedCallback() {
    if (!this._mounted) {
      this._mounted = true;
      this._root = this;
      this._root = this.attachShadow({mode: 'open'});
      this._root.appendChild(document.importNode(template.content, true));
      this.addEventListener('click', e => this._onClick(e));
      this.addEventListener('mouseover', e => this._onMouseover(e));
      this.addEventListener('mouseout', e => this._onMouseout(e));
    }
  }
  set plan(plan) {
    this.setAttribute("hash", plan.hash);
    this._plan = plan;
  }
  _onClick() {
    this._fire('plan-choose', this._plan);
  }
  _fire(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, {detail}));
  }
  _onMouseover() {
    this._hover(true);
  }
  _onMouseout() {
    this._hover(false);
  }
  _hover(selected) {
    this._fire('plan-hover', {hash: this._plan.hash, selected});
  }
}

customElements.define('suggestion-element', SuggestionElement);

export default SuggestionElement;
