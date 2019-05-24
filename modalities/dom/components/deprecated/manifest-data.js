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
  manifest-data [banner] {
    padding: 6px 4px;
    background-color: whitesmoke;
    margin-bottom: 8px;
    border-top: 1px dotted silver;
  }
</style>
<div banner>Manifests</div>
<div style='padding: 4px;'>
  <button on-click='_onApply' disabled='{{applyDisabled}}'>Apply Changes</button>
</div>
<div>{{items}}</div>
<br>

`;

const manifestItem = html`

<div style='padding: 8px 0; border-top: 1px dotted silver;' style%='{{style}}'>
  <label title='{{url}}' style='display: flex; align-items: center;'>
    <input style='vertical-align: middle; margin: 0 8px; flex-shrink: 0;' type='checkbox' checked='{{include}}' key='{{key}}' on-click='_onCheckInput'>
    <div>
      <div style='font-size:0.7em;'>{{url}}</div>
      <!--<div style='font-size:0.7em; font-style:italic;'>{{origin}}</div>
      <div style='font-size:0.9em; padding: 4px 0;'>{{path}}</div>-->
    </div>
  </label>
</div>

`;

class ManifestData extends HTMLElement {
  constructor() {
    super();
    this._manifests = [];
    this._exclusions = [];
    this._data = [];
  }
  connectedCallback() {
    this.text = '';
    this._dom = Xen.Template.stamp(template).events(this).appendTo(this);
    this.dirty = false;
  }
  set manifests(manifests) {
    this._manifests = manifests;
    this._updateData();
  }
  set exclusions(exclusions) {
    this._exclusions = exclusions;
    this._updateData();
    this.dirty = false;
  }
  get exclusions() {
    return this._exclusions;
  }
  set dirty(dirty) {
    this._dom.set({applyDisabled: !dirty});
  }
  _updateData() {
    if (this._manifests || this._exclusions) {
      this._render();
    }
  }
  _render() {
    const manifests = this._manifests || [];
    const exclusions = this._exclusions || [];
    this._dom.set({
      items: {
        template: manifestItem,
        models: manifests.map((m, i) => {
          const url = m; //new URL(m, location.href);
          const include = exclusions.indexOf(m) < 0;
          return {
            include,
            url: m,
            //origin: url.origin,
            //path: url.pathname,
            style: include ? {} : {backgroundColor: 'whitesmoke', color: '#888'},
            key: i
          };
        })
      }
    });
  }
  _onCheckInput(e) {
    const {key, checked} = e.currentTarget;
    const m = this._manifests[key];
    this._exclusions = checked ? this._exclusions.filter(e => e != m) : this._exclusions.concat([m]);
    this.dirty = true;
  }
  _onApply(e) {
    this.dispatchEvent(new CustomEvent('exclusions', {detail: this._exclusions}));
    this.dirty = false;
  }
}
customElements.define('manifest-data', ManifestData);
