/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
(() => {

let template = Object.assign(document.createElement('template'), {innerHTML:
`<style>
  :host {
    display: block;
    box-shadow: 0px 1px 5px 0px rgba(102,102,102,0.21);
    background-color: white;
    color: #666666;
    padding: 4px;
    margin-bottom: 8px;
    cursor: pointer;
  }
  :host(:hover) {
    background-color: rgba(86,255,86,0.25);
    box-shadow: 0px 3px 11px 0px rgba(102,102,102,0.41);
    padding-top: 2px;
    margin-bottom: 10px;
    color: black;
  }
</style>
<slot></slot>`});

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
    this.setAttribute('hash', plan.hash);
    this._plan = plan;
  }
  _onClick() {
    this._fire('plan-selected', this._plan);
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
  _fire(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, {detail}));
  }
}

customElements.define('suggestion-element', SuggestionElement);

})();
