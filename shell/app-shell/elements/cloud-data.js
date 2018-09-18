/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';

import './cloud-data/cloud-arc.js';
import './cloud-data/cloud-steps.js';
import './cloud-data/cloud-handles.js';

import './fb-data/fb-users.js';
import './fb-data/fb-user.js';
import './fb-data/fb-user-context.js';

import './sharing/user-context.js';

const html = Xen.Template.html;

const template = html`

  <fb-users
    on-users="_onForward"
  ></fb-users>

  <fb-user
    config="{{config}}"
    userid="{{userid}}"
    context="{{context}}"
    key="{{key}}"
    arc="{{arc}}"
    on-userid="_onForward"
    on-user="_onForward"
  ></fb-user>

  <!-- <fb-user-context
    config="{{config}}"
    userid="{{userid}}"
    context="{{context}}"
    arc="{{arc}}"
    on-friends="_onForward"
  ></fb-user-context> -->

  <user-context
    context="{{context}}"
    userid="{{userid}}"
  ></user-context>

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
    config="{{config}}"
    key="{{key}}"
    plans="{{plans}}"
    plan="{{plan}}"
    on-suggestion="_onForward"
  ></cloud-steps>

  <cloud-handles
    config="{{config}}"
    key="{{key}}"
    arc="{{arc}}"
    plans="{{plans}}"
  ></cloud-handles>
`;

const log = Xen.logFactory('CloudData', '#004f00');

class CloudData extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'users', 'userid', 'context', 'user', 'profile', 'key',
      'metadata', 'description', 'share', 'plans', 'plan', 'arc'];
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
