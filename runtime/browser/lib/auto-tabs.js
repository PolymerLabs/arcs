/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

const Xen = require('../lib/xenon-template.js');

let template = Object.assign(document.createElement('template'), {
  innerHTML: `
<style>
  :host [crumbs] {
    background-color: #f2f2f2;
    /*color: #666;*/
    font-family: inherit;
    font-style: italic;
    font-size: 0.7em;
    padding: 4px 8px 4px 4px;
    /* shut off for now */
    display: none;
  }
</style>
<div crumbs>{{crumbs}}</div>
<slot></slot>
  `.trim()
});

class AutoTabs extends HTMLElement {
  connectedCallback() {
    if (!this._mounted) {
      this._pages = [];
      this._mounted = true;
      this._root = this.attachShadow({mode: 'open'});
      this._root.addEventListener('slotchange', this.onSlotChange.bind(this));
      this._dom = Xen.stamp(template).appendTo(this._root);
    }
  }
  onSlotChange(e) {
    //console.log('AutoTabs::slotchange: ', e);
    let nodes = this._root.querySelector('slot').assignedNodes();
    let pages = nodes.filter(n => {
      switch(n.localName) {
        case undefined:
        case 'style':
        case 'slot':
          break;
        default:
          return true;
      }
    });
    /*
    pages.forEach(p => {
      p.style.border = "1px solid #eee";
    });
    */
    let crumbs = pages.map((p,i) => {
      return `Page ${i}`;
    }).join(' / ');
    this._dom.set({crumbs});
  }
}

customElements.define('auto-tabs', AutoTabs);

module.exports = AutoTabs;