/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import './data-item.js';
import Xen from './xen/xen.js';

const html = Xen.Template.html;
const template = html`

<style>
  data-explorer {
    display: block;
    /*border-bottom: 1px solid hsl(0,0%,75%);*/
  }
  data-item {
    display: flex;
    /*border-bottom: 1px solid hsl(0,0%,75%);*/
  }
  data-item > * {
    white-space: nowrap;
    /*
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px dotted silver;
    border-left: none;
    border-top: none;
    */
  }
  data-item > left {
    display: flex;
    flex-shrink: 0;
    padding: 4px 8px 4px 4px;
    justify-content: flex-end;
    font-weight: bold;
    font-size: 0.9em;
    /*
    align-items: center;
    width: 96px;
    background-color: whitesmoke;
    */
  }
  /*
  data-item > right {
    flex: 3;
  }
  */
  data-item > right > div {
    padding: 4px;
  }
  right > data-explorer:not([hidden]) {
    padding-top: 1em;
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
    let o = props.object || Object;
    return {
      items: {
        template: templateDataItem,
        models: this._formatValues(o, Boolean(props.expand))
      }
    };
  }
  _formatValues(object, expand) {
    return Object.keys(object).map(n => {
      let v = object[n];
      if (v) {
        if (typeof v === 'function') {
          v = '(function)';
        }
      }
      return {
        name: n,
        value: v,
        expand
      };
    });
  }
  _onItemChange(e) {
    console.log(e.target.name, e.detail);
    this.object[e.target.name] = e.detail;
    this.dispatchEvent(new CustomEvent('object-change', {bubbles: true}));
  }
}
customElements.define('data-explorer', DataExplorer);
