/*
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../xen/xen.js';
import './data-item.js';

const template = Xen.Template.html`

<style>
  :host {
    display: block;
  }
</style>
<table>
</table>
`;

const templateDataItem = html`

<data-item name="{{name}}" value="{{value}}" expand="{{expand}}" on-item-change="_onItemChange"></data-item>

`;

class DataExplorer extends Xen.Base {
  static get observedAttributes() {
    return ['object', 'expand'];
  }
  get template() {
    return template;
  }
  _setValueFromAttribute(name, value) {
    // convert boolean-attribute to boolean
    if (name == 'expand') {
      value = value != null;
    }
    super._setValueFromAttribute(name, value);
  }
  _render(props, state) {
    const o = props.object || Object;
    return {
      items: {
        template: templateDataItem,
        models: this._formatValues(o, Boolean(props.expand))
      }
    };
  }
  _formatValues(object, expand) {
    return Object.keys(object).map(name => ({name, value: object[name], expand}));
  }
  _onItemChange(e) {
    console.log(e.target.name, e.detail);
    this.object[e.target.name] = e.detail;
    this.dispatchEvent(new CustomEvent('object-change', {bubbles: true}));
  }
}
customElements.define('data-explorer', DataExplorer);
