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

const template = Xen.Template.createTemplate(
  `<style>
    data-explorer {
      display: block;
    }
    data-item {
      display: flex;
    }
    data-item > * {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border: 1px dotted silver;
      border-left: none;
      border-top: none;
    }
    data-item > left {
      display: flex;
      align-items: center;
      padding: 4px 8px 4px 4px;
      justify-content: flex-end;
      font-weight: bold;
      font-size: 0.9em;
      width: 96px;
      background-color: whitesmoke;
    }
    data-item > right {
      flex: 3;
    }
    data-item > right > div {
      padding: 4px;
    }</style>
    <div>{{items}}</div>`
);

const templateDataItem = Xen.Template.createTemplate(
  `<data-item name="{{name}}" value="{{value}}" on-item-change="_onItemChange"></data-item>`
);

class DataExplorer extends Xen.Base {
  static get observedAttributes() { return ['object']; }
  get template() {
    return template;
  }
  /*
  _doMount() {
    this._dom = Xen.stamp(this.template).events(this).appendTo(this);
  }
  _update(props, state) {
    this._dom.set(this._render(props, state));
  }
  */
  _render(props, state) {
    let o = props.object || Object;
    return {
      items: {
        template: templateDataItem,
        models: this._formatValues(o)
      }
    };
  }
  _formatValues(object) {
    return Object.keys(object).map(n => {
      let v = object[n];
      if (v) {
        if (Array.isArray(v)) {
          //v = `(array [${v.length}])`;
        } else if (typeof v === 'function') {
          v = '(function)';
        } else if (typeof v === 'object') {
          /*
          let proto = Object.getPrototypeOf(v);
          if (proto && proto !== Object.prototype) {
            v = `non-POJO: {${Object.keys(v).join(', ')}}`;
          }
          */
        }
      }
      return {
        name: n,
        value: v
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
