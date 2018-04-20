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
import './cloud-data/cloud-user.js';
import './cloud-data/cloud-arc.js';
import './cloud-data/cloud-steps.js';
import './cloud-data/cloud-handles.js';
import './cloud-data/cloud-profile-handles.js';

// templates
const html = Xen.Template.html;
const template = html`

  <cloud-users
    on-users="_onForward"
  ></cloud-users>

  <cloud-user
    userid="{{userid}}"
    user="{{user}}"
    arcs="{{arcs}}"
    key="{{key}}"
    on-user="_onForward"
    on-arcs="_onForward"
  ></cloud-user>

  <cloud-arc
    config="{{config}}"
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    description="{{description}}"
    share="{{share}}"
    plan="{{plan}}"
    on-key="_onForward"
    on-metadata="_onForward"
    on-share="_onForward"
    on-serialization="_onForward"
  ></cloud-arc>

  <cloud-steps
    key="{{key}}"
    suggestions="{{suggestions}}"
    plan="{{plan}}"
    on-suggestion="_onForward"
  ></cloud-steps>

  <cloud-handles
    key="{{key}}"
    arc="{{arc}}"
    suggestions="{{suggestions}}"
  ></cloud-handles>

  <cloud-profile-handles
    arc="{{arc}}"
    arcs="{{arcs}}"
  ></cloud-profile-handles>
`;

const log = Xen.logFactory('CloudData', '#004f00');

class CloudData extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'userid', 'user', 'arcs', 'key', 'metadata', 'description', 'share', 'suggestions', 'plan', 'arc'];
  }
  get template() {
    return template;
  }
  _render(props, state, oldProps) {
    return [props, state];
  }
  _onForward(e, data) {
    this._fire(e.type, data);
  }
}
customElements.define('cloud-data', CloudData);
