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
import WatchGroup from './watch-group.js';

const log = Xen.logFactory('CloudUsers', '#883997');

class CloudUsers extends Xen.Base {
  _getInitialState() {
    return {
      watch: new WatchGroup()
    };
  }
  _update(props, state, lastProps) {
    if (!state.connected) {
      state.connected = true;
      this._connect(state);
    }
  }
  get _usersdb() {
    return Firebase.db.child('users');
  }
  async _connect(state) {
    state.watch.watches = [{
      path: `users`,
      handler: snap => this._debounceRemoteChanged(snap, state)
    }];
    log('watching `users`');
  }
  _debounceRemoteChanged(snap, state) {
    // debounce if we already have some users data
    const delay = state.users ? 3000 : 1;
    state.debounce = ArcsUtils.debounce(state.debounce, () => this._remoteChanged(snap), delay);
  }
  _remoteChanged(snap) {
    let users = snap.val() || [];
    Object.keys(users).forEach(k => users[k].id = k);
    log('READ `users` from cloud', users);
    this._setState({users});
    this._fire('users', users);
  }
}
customElements.define('cloud-users', CloudUsers);
