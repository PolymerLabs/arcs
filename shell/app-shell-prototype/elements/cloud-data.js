/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// code
import Xen from '../../components/xen/xen.js';
import ArcsUtils from '../lib/arcs-utils.js';

// elements
import './cloud-data/cloud-users.js';
import './cloud-data/cloud-arc.js';

// globals
/* global shellPath*/

const html = Xen.Template.html;

// templates
const template = html`

  <cloud-users on-users="_onUsers"></cloud-users>
  <cloud-arc key="{{key}}" metadata="{{metadata}}" on-key="_onKey" on-metadata="_onMetadata"></cloud-users>

`;

const log = Xen.logFactory('CloudData', '#004f00');

class CloudData extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'metadata'];
  }
  get template() {
    return template;
  }
  _render(props, state) {
    return [props, state];
  }
  _onUsers(e, users) {
    this._fire('users', users);
  }
  _onKey(e, key) {
    this._fire('key', key);
  }
  _onMetadata(e, metadata) {
    this._fire('metadata', metadata);
  }
}
customElements.define('cloud-data', CloudData);
