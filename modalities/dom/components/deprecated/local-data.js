/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';

const html = Xen.Template.html;
const template = html`

<style>
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
  <icon title="Promote" on-click="_onPromoteClick">assignment_returned</icon>
</div>

`;

class LocalData extends HTMLElement {
  connectedCallback() {
    this.text = '';
    this._dom = Xen.Template.stamp(template).events(this).appendTo(this);
  }
  set manifest(manifest) {
    this._dom.set({manifest});
  }
  _onManifestChange(e) {
    const detail = e.currentTarget.value;
    this.dispatchEvent(new CustomEvent('update-manifest', {detail}));
  }
  _onPromoteClick(e) {
    this.dispatchEvent(new CustomEvent('promote-manifest'));
  }
}

customElements.define('local-data', LocalData);
