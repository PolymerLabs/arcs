/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';
import './data-explorer.js';

const html = Xen.Template.html;
const template = html`

<style>
  :host {
    white-space: nowrap;
  }
  container {
    display: flex;
  }
  container[object] {
    display: block;
  }
  left {
    display: flex;
    flex-shrink: 0;
    padding: 4px 6px 4px 0;
    font-weight: bold;
    color: #555555;
    font-size: 0.8em;
  }
  right {
    display: flex;
    align-items: center;
  }
  [expand] {
    padding-bottom: 3px;
  }
  data-explorer:not([hidden]) {
    padding-left: 32px;
  }
  [type="object"] {
    font-weight: bold;
    font-size: 0.9em;
  }
  [type="number"] {
    color: blue;
  }
  [type="string"] {
    color: darkgreen;
  }
  [type="string"]::before, [type="string"]::after {
    content: '"';
  }
</style>

<container object$="{{isobject}}">
  <left title="{{name}}" on-click="_onExpandClick"><span>{{name}}</span>:</left>
  <right>
    <div expand hidden="{{hideexpand}}" on-click="_onExpandClick">+</div>
    <div check hidden="{{notbool}}" title="{{name}}"><input type="checkbox" checked="{{value}}" on-click="_onCheckInput"></div>
    <div value type$="{{type}}" hidden="{{notstring}}" title="{{title}}" style="white-space: pre;">{{value}}</div>
    <data-explorer hidden="{{notobject}}" object="{{object}}"></data-explorer>
  </right>
</container>

`;

class DataItem extends Xen.Base {
  static get observedAttributes() {
    return ['name', 'value', 'expand'];
  }
  get template() {
    return template;
  }
  get Xhost() {
     return this;
  }
  _onCheckInput(e) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('item-change', {detail: e.target.checked}));
  }
  _willReceiveProps(props, state) {
    state.expanded = Boolean(props.expand);
  }
  _render({name, value}, state) {
    // always expand array indices
    if (!isNaN(Number(name))) {
      state.expanded = true;
    }
    let type = typeof value;
    if (type === 'function') {
      value = '(function)';
    } else if (type === 'string' && !isNaN(Number(value))) {
      type = 'number';
    }
    const isnull = value === null;
    const isobject = (type === 'object' && !isnull);
    const isstring = (type === 'string' || type === 'number' || isnull);
    const isbool = (type==='boolean');
    return {
      type,
      name,
      value: isnull || isobject ? 'null' : isbool ? value : String(value),
      isobject: isobject && state.expanded,
      notstring: !isstring,
      notbool: !isbool,
      notobject: !isobject || !state.expanded,
      object: isobject && state.expanded ? value : null,
      hideexpand: state.expanded || !isobject,
      title: isstring ? value : name
    };
  }
  _onExpandClick(e) {
    e.stopPropagation();
    this._setState({expanded: !this._state.expanded});
  }
}
customElements.define('data-item', DataItem);
