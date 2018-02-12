/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from './xen/xen.js';

const template = Xen.Template.createTemplate(
  `<style>
    :host [crumbs] {
      background-color: #f2f2f2;
      font-family: inherit;
      font-size: 0.8em;
      padding: 12px;
      white-space: nowrap;
    }
    :host [crumbs] > a {
      background-color: white;
      border-radius: 8px;
      padding: 4px 8px;
      margin-right: 8px;
      cursor: pointer;
    }
    :host [crumbs] > a[selected] {
      background-color: gray;
      color: white;
      border-radius: 0;
    }
  </style>
  <div crumbs>{{crumbs}}</div>
  <slot></slot>`
);

const crumb = Xen.Template.createTemplate(
  `<a selected$="{{selected}}" tab="{{tab}}" on-click="_onCrumbClick">{{crumb}}</a>`
);

class SimpleTabs extends HTMLElement {
  get template() {
    return template;
  }
  connectedCallback() {
    if (!this._mounted) {
      this._pages = [];
      this._mounted = true;
      this._root = this.attachShadow({mode: 'open'});
      this._root.addEventListener('slotchange', this.onSlotChange.bind(this));
      this._dom = Xen.Template.stamp(this.template).events(this).appendTo(this._root);
      this.tab = 0;
    }
  }
  get pages() {
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
    return pages;
  }
  get tab() {
    return this._tab;
  }
  set tab(tab) {
    this._tab = tab;
    let pages = this.pages;
    pages.forEach((page, i) => {
      page.style.display = (i !== tab) ? 'none' : '';
    });
    this._render();
  }
  onSlotChange(e) {
    this._render();
  }
  _render() {
    let pages = this.pages;
    let crumbs = {
      template: crumb,
      models: pages.map((p,i) => {
        return {
          tab: i,
          crumb: p.tab || p.getAttribute('tab') || `Page ${i}`,
          selected: (i === this.tab)
        };
      })
    };
    this._dom.set({crumbs});
  }
  _onCrumbClick(e) {
    this.tab = e.currentTarget.tab;
  }
}
customElements.define('simple-tabs', SimpleTabs);

export default SimpleTabs;
