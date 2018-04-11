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

const log = Xen.logFactory('CloudUser', '#772987');

class CloudUser extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['user', 'key', 'sharing'];
  }
  _getInitialState() {
    return {
      userWatch: new WatchGroup(),
      watch: new WatchGroup()
    };
  }
  _update({user}, state, lastProps) {
    if (user) {
      if (user.info && !user.id) {
        this._createUser(Firebase.db, user);
      }
      if (user.id && user.id !== state.id) {
        state.id = user.id;
        // read user from fb
        state.userWatch.watches = [{
          path: `users/${user.id}`,
          handler: snap => this._userChanged(snap)
        }];
      }
    }
    if (!state.watching) {
      state.watching = true;
      state.watch.watches = [{
        path: `arcs`,
        handler: snap => this._arcsChanged(snap)
      }];
    }
  }
  _createUser(db, user) {
    log('WRITING user (createUser)', user);
    // TODO(sjmiles): user in the database doesn't host it's own id field (equivalent to it's key)
    // but the field in RAM does, is this a footgun?
    // Modifying this record after creating it could cause thrash (do we write it again right away?)
    user.id = db.child('users').push(user).key;
    return user;
  }
  _userChanged(snap) {
    const user = snap.val();
    log(`[users/${user.id}] node fired a change event`);
    //this._fire('user', user);
  }
  _arcsChanged(snap) {
    const arcs = snap.val();
    log('[arcs] node fired a change event');
    this._fire('arcs', arcs);
  }
}
customElements.define('cloud-user', CloudUser);
