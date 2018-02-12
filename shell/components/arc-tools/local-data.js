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

const template = Xen.Template.createTemplate(
  `<style>
    local-data [banner] {
      padding: 6px 4px;
      background-color: whitesmoke;
      border-top: 1px dotted silver;
    }
    local-data [editor] {
      display: flex;
      align-items: center;
      padding: 8px 8px;
    }
    local-data input {
      flex: 1;
      margin-right: 8px;
      padding: 4px;
    }
    local-data i {
      margin: 0 4px;
    }
  </style>
  <div banner>Local Config</div>
  <div editor>
    <input style="flex: 1;" value="{{manifest}}" on-change="_onManifestChange">
    <i class="material-icons" title="Promote" on-click="_onPromoteClick">assignment_returned</i>
  </div>`
);

class LocalData extends HTMLElement {
  connectedCallback() {
    this.text = '';
    this._dom = Xen.Template.stamp(template).events(this).appendTo(this);
  }
  set manifest(manifest) {
    this._dom.set({manifest});
  }
  _onManifestChange(e) {
    let detail = e.currentTarget.value;
    this.dispatchEvent(new CustomEvent('update-manifest', {detail}));
  }
  _onPromoteClick(e) {
    this.dispatchEvent(new CustomEvent('promote-manifest'));
  }
}
customElements.define('local-data', LocalData);
