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
import Const from './../../constants.js';

const log = Xen.logFactory('CloudUser', '#772987');

class CloudUser extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['userid', 'user', 'arcs', 'key', 'sharing'];
  }
  _getInitialState() {
    return {
      userInfoWatch: new WatchGroup(),
      userArcsWatch: new WatchGroup(),
      arcsWatch: new WatchGroup()
    };
  }
  _update({userid, user, arcs, key}, state, oldProps) {
    if (userid && (!user || user.id !== userid)) {
      // read user from fb
      state.userInfoWatch.watches = [{
        path: `users/${userid}/info`,
        handler: snap => this._userInfoChanged(userid, snap)
      }];
      state.userArcsWatch.watches = [{
        path: `users/${userid}/arcs`,
        handler: snap => this._userArcsChanged(userid, snap)
      }];
    }
    if (user && (user.id === userid)) {
      if (arcs && arcs !== state.arcs) {
        this._localArcsChanged(Firebase.db, arcs);
      }
      //if (user.info && !user.id) {
      //  this._createUser(Firebase.db, user);
      //}
      // if (user !== state.user) {
      //   state.user = user;
      //   Firebase.db.child(`users/${user.id}')
      // }
      if (key && key !== state.key && !Const.SHELLKEYS[key]) {
        state.key = key;
        const path = `users/${user.id}/arcs/${key}/touched`;
        log(`writing to [${path}]`);
        Firebase.db.child(path).set(
          Firebase.firebase.database.ServerValue.TIMESTAMP
        );
      }
    }
  }
  _userInfoChanged(userid, snap) {
    log(`[users/${userid}/info] node fired a change event`);
    const user = snap.val();
    this._validateUser(userid, user);
    this._fire('user', user);
  }
  _validateUser(userid, user) {
    user.id = userid;
    user.info = user.info || {};
  }
  _userArcsChanged(userid, snap) {
    log(`[users/${userid}/arcs] node fired a change event`);
    const arcs = snap.val();
    this._state.arcs = arcs;
    this._watchArcs(arcs);
  }
  _watchArcs(arcs) {
    log(`watching user's arcs`);
    const keys = Object.keys(arcs);
    this._state.arcsWatch.watches = keys.map(key => ({
      path: `arcs/${key}/metadata`,
      handler: snap => this._arcMetadataChanged(key, snap)
    }));
  }
  _arcMetadataChanged(key, snap) {
    const {user} = this._props;
    let {arcs} = this._state;
    const metadata = snap.val();
    log(`[arcs/${key}/metadata] node fired a change event`, metadata);
    arcs[key].metadata = metadata;
    arcs = this._state.arcs = Xen.clone(arcs);
    this._fire('arcs', arcs);
  }
  _localArcsChanged(db, arcs) {
    log(`applying arcs list changes to Firebase:`, arcs);
    const {user} = this._props;
    Object.keys(arcs).forEach(key => {
      const path = `users/${user.id}/arcs/${key}`;
      const arc = Xen.clone(arcs[key]);
      delete arc.metadata;
      if (arc.deleted) {
        log(`removing [${path}]`);
        db.child(`${path}`).remove();
      } else {
        // TODO(sjmiles): don't have to do this most of the time, consider
        // dirty checking, or replacing input `arcs` with deltas only
        log(`setting [${path}] to`, arc);
        db.child(`${path}`).set(arc);
      }
    });
  }
  _createUser(db, user) {
    log('WRITING user (createUser)', user);
    // TODO(sjmiles): user in the database doesn't host it's own id field (equivalent to it's key)
    // but the field in RAM does, is this a footgun?
    // Modifying this record after creating it could cause thrash (do we write it again right away?)
    user.id = db.child('users').push(user).key;
    return user;
  }
}
customElements.define('cloud-user', CloudUser);
