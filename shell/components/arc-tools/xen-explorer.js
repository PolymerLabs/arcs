/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import '../data-explorer.js';
import Xen from '../xen/xen.js';

const template = Xen.html`
  <style>
    button {
      margin: 8px;
    }
  </style>
  <div><button on-click="_onUpdate">Update</button></div>
  <data-explorer style="font-size: 0.8em;" object="{{data}}"></data-explorer>
`;

class XenExplorer extends Xen.Base {
  static get observedAttributes() { return []; }
  get template() {
    return template;
  }
  _render(props, state) {
    if (!state.data) {
      this._onUpdate();
    }
    return state;
  }
  _onUpdate() {
    this._setState({data: Xen.walker()});
  }
}
customElements.define('xen-explorer', XenExplorer);