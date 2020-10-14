/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../../../modalities/dom/components/xen/xen-async.js';
import './data-item.js';

const html = Xen.Template.html;
const template = html`

<style>
  :host {
    display: block;
  }
</style>

<div>{{items}}</div>

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
