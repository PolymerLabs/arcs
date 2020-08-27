/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import '../../elements/data-explorer.js';
import Xen from '../xen.js';
import TreeStyles from './tree.2.css.js';

const template = Xen.html`
  <style>
    :host {
      cursor: pointer;
    }
    button {
      font-family: inherit;
      margin: 8px;
    }
    ${TreeStyles}
    span {
      color: gray;
    }
    [selected] {
      color: black;
      background-color: whitesmoke;
    }
  </style>
  <div><button on-click="_onUpdate">Update</button></div>
  <div style="display: flex;">
    <div style="flex-shrink: 0; margin-left: -1px;" on-click="_onTreeClick" unsafe-html="{{tree}}"></div>
    <data-explorer style="flex: 1;" object="{{data}}" expand></data-explorer>
  </div>
`;

const log = Xen.logFactory('XenExplorer', 'purple');

class XenExplorer extends Xen.Base {
  static get observedAttributes() {
    return [];
  }
  get template() {
    return template;
  }
  _render(props, state) {
    if (!state.data) {
      const data = Xen.walker();
      const {tree, map} = this._renderElementTreeHtml(data, state.selected);
      this._setState({tree, data, map});
    }
    return state;
  }
  _renderElementTreeHtml(data, selected) {
    const builder = (name, record, map) => {
      record.name = name;
      const key = map.push(record) - 1;
      let html = '';
      if (record.children) {
        const names = Object.keys(record.children).filter(name => !name.includes('data-explorer'));
        html = names.map(name => builder(name, record.children[name], map)).join('');
      }
      return `<ul><li><span ${record.node === selected ? 'selected' : ''} key="${key}">${name}</span>${html}</li></ul>`;
    };
    const map = [];
    const tree = builder('root', {children: data}, map);
    return {tree, map};
  }
  _onTreeClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.localName === 'span') {
      const key = e.target.getAttribute('key');
      const record = this._state.map[key];
      this._setState({
        selected: record.node,
        data: {
          name: record.name,
          props: record.props,
          state: record.state
        }
      });
      window.$x = record.node;
    }
  }
}
customElements.define('xen-explorer', XenExplorer);
