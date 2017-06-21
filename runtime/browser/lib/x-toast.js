/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let template = Object.assign(document.createElement('template'), {innerHTML: `

<style>
  :host {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    border: 1px solid silver;
    transform: translate3d(0, 100%, 0) translateY(-26px);
    transition: transform 80ms ease-in;
  }
  :host([open]) {
    transform: translate3d(0, 0, 0);
  }
  [header] {
    background-color: white;
    height: 24px;
    line-height: 24px;
    text-align: center;
    font-size: 0.8em;
    border-bottom: 1px solid #dddddd;
    box-sizing: border-box;
  }
</style>
<div header><slot name="header"></slot></div>
<slot></slot>

`.trim()});

class XToast extends HTMLElement {
  connectedCallback() {
    if (!this._mounted) {
      this._mounted = true;
      this._root = this.attachShadow({mode: 'open'});
      this._root.appendChild(document.importNode(template.content, true));
      this._root.querySelector('[header]').onclick = () => this.open = !this.open;
    }
  }
  get open() {
    return this.hasAttribute('open');
  }
  set open(open) {
    this[open ? 'setAttribute' : 'removeAttribute']('open', '');
  }
}
customElements.define('x-toast', XToast);
