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

(function() {

const template = Xen.Template.createTemplate(`

<style>
  :host {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    transform: translate3d(0, 100%, 0) translateY(-33px);
    transition: transform 80ms ease-in;
  }
  :host([open]) {
    transform: translate3d(0, 0, 0);
  }
  [header] {
    font-size: 0.8em;
    text-align: center;
    background-color: white;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
  }
</style>
<div header><slot name="toast-header"></slot></div>
<slot></slot>

`.trim());

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

})();
