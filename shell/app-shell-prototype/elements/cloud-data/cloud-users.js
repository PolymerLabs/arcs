/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../../components/xen/xen.js';
import ArcsUtils from '../../lib/arcs-utils.js';
import Firebase from './firebase.js';

const log = Xen.logFactory('CloudUsers', '#883997');

class CloudUsers extends Xen.Base {
  _update(props, state, lastProps) {
    if (!state.connected) {
      state.connected = true;
      this._connect();
    }
  }
  get _usersdb() {
    return Firebase.db.child('users');
  }
  _disconnect() {
    if (this._off) {
      this._off();
      this._off = null;
    }
  }
  async _connect() {
    this._disconnect();
    const node = this._usersdb;
    const watch = node.on('value', snap => this._debounceRemoteChanged(snap));
    this._off = () => node.off('value', watch);
    log('watching', String(node));
  }
  _debounceRemoteChanged(snap) {
    // debounce if we already have some users data
    const delay = this._state.users ? 3000 : 1;
    this._debounce = ArcsUtils.debounce(this._debounce, () => this._remoteChanged(snap), delay);
  }
  _remoteChanged(snap) {
    let users = snap.val() || [];
    Object.keys(users).forEach(k => users[k].id = k);
    log('READ `users` from cloud', users);
    this._fire('users', users);
    this._setState({users});
  }
}
customElements.define('cloud-users', CloudUsers);
