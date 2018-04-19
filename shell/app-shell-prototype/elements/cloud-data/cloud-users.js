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
    if (!state.watch.watches) {
      log('watching `users`');
      state.watch.watches = [{
        path: `users`,
        handler: snap => this._debounceRemoteChanged(snap, this._state)
      }];
    }
  }
  _debounceRemoteChanged(snap, state) {
    // throttle notifications if we already have some users data
    const delay = state.users ? 3000 : 1;
    state.debounce = ArcsUtils.debounce(state.debounce, () => this._remoteChanged(snap), delay);
  }
  _remoteChanged(snap) {
    const users = snap.val() || [];
    log('READ `users` from cloud', users);
    // ensure every user contains it's own id and an info record
    Object.keys(users).forEach(k => {
      const user = users[k];
      user.id = k;
      user.info = user.info || {name: 'Anonymous'};
    });
    this._fire('users', users);
    // save `users` in state for throttling notifications
    this._setState({users});
  }
}
customElements.define('cloud-users', CloudUsers);
