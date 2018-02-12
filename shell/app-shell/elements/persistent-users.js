/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';
import ArcsUtils from "../lib/arcs-utils.js";

class PersistentUsers extends Xen.Base {
  static get observedAttributes() { return []; }
  _update(props, state, lastProps) {
    if (!state.connected) {
      state.connected = true;
      this._connect();
    }
    this._fire('users', state.users);
  }
  get _usersdb() {
    return db.child('users');
  }
  _disconnect() {
    if (this._off) {
      this._off();
      this._off = null;
    }
  }
  async _connect() {
    this._disconnect();
    let node = this._usersdb;
    PersistentUsers.log('watching', String(node));
    let watch = node.on('value', snap => this._debounceRemoteChanged(snap));
    this._off = () => node.off('value', watch);
  }
  _debounceRemoteChanged(snap) {
    // debounce if we already have some users data
    const delay = this._state.users ? 3000 : 1;
    this._debounce = ArcsUtils.debounce(this._debounce, () => this._remoteChanged(snap), delay);
  }
  _remoteChanged(snap) {
    let users = snap.val() || [];
    Object.keys(users).forEach(k => users[k].id = k);
    this._setState({users});
    PersistentUsers.log('remoteChanged', users);
    this._disconnect();
  }
}
PersistentUsers.log = Xen.Base.logFactory('PersistentUsers', '#883997');
customElements.define('persistent-users', PersistentUsers);
