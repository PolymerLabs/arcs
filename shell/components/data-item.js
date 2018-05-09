/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import './data-explorer.js';
import Xen from './xen/xen.js';

const html = Xen.Template.html;
const template = html`

<left title="{{name}}" on-click="_onExpandClick"><span>{{name}}</span>:</left>
  <right>
    <div hidden="{{hideexpand}}" on-click="_onExpandClick">+</div>
    <div hidden="{{notbool}}" title="{{name}}"><input type="checkbox" checked="{{value}}" on-click="_onCheckInput"></div>
    <div hidden="{{notstring}}" title="{{title}}" style="white-space: pre;">{{value}}</div>
    <data-explorer hidden="{{notobject}}" object="{{object}}"></data-explorer>
  </right>

`;

class DataItem extends Xen.Base {
  static get observedAttributes() {
    return ['name', 'value', 'expand'];
  }
  get template() {
    return template;
  }
   get host() {
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
    let isnull = props.value === null;
    let isobject = (type === 'object' && !isnull),
        isstring = (type === 'string' || type === 'number' || isnull),
        isbool = (type==='boolean');
    if (!isNaN(Number(props.name))) {
      state.expanded = true;
    }
    return {
      name: props.name,
      notstring: !isstring,
      notbool: !isbool,
      notobject: !isobject || !state.expanded,
      object: isobject && state.expanded ? props.value : null,
      hideexpand: state.expanded || !isobject,
      value: isnull || isobject ? '(null)' : isbool ? props.value : String(props.value),
      title: isstring ? props.value : props.name
    };
  }
  _onExpandClick(e) {
    e.stopPropagation();
    this._setState({expanded: !this._state.expanded});
  }
}
customElements.define('data-item', DataItem);
