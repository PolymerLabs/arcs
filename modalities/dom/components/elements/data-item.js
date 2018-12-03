/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
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
    display: block;
  }
  [expand] {
    padding-top: 2px;
  }
  data-explorer:not([hidden]) {
    padding-left: 32px;
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
  _render(props, state) {
    let type = typeof props.value;
    if (type === 'string' && !isNaN(Number(props.value))) {
      type = 'number';
    }
    const isnull = props.value === null;
    const isobject = (type === 'object' && !isnull);
    const isstring = (type === 'string' || type === 'number' || isnull);
    const isbool = (type==='boolean');
    // always expand array indices
    if (!isNaN(Number(props.name))) {
      state.expanded = true;
    }
    return {
      name: props.name,
      value: isnull || isobject ? '(null)' : isbool ? props.value : String(props.value),
      type,
      isobject: isobject && state.expanded,
      notstring: !isstring,
      notbool: !isbool,
      notobject: !isobject || !state.expanded,
      object: isobject && state.expanded ? props.value : null,
      hideexpand: state.expanded || !isobject,
      title: isstring ? props.value : props.name
    };
  }
  _onExpandClick(e) {
    e.stopPropagation();
    this._setState({expanded: !this._state.expanded});
  }
}
customElements.define('data-item', DataItem);
