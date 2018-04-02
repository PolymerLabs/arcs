/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import WatchGroup from './watch-group.js';
import Xen from '../../components/xen/xen.js';

const db = window.db;
const firebase = window.firebase;

const log = Xen.logFactory('PersistentUser', '#65499c');

class PersistentUser extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['id', 'user', 'key'];
  }
  _getInitialState() {
    return {
      watch: new WatchGroup(),
      db: db.child('users')
    };
  }
  _update(props, state, lastProps, lastState) {
    // if there is no id, but there is a user record with a name, it's a request for a new user
    if (!props.id && props.user && props.user.name) {
      const user = this._createUser(state.db, props.user);
      this._fire('user', user);
    }
    // if there is a new id, watch the corresponding database record
    if (props.id && state.id !== props.id) {
      state.id = props.id;
      state.watch.watches = [this._watchUser(state.db, props.id)];
    }
    // if user record doesn't reference check with our cache, write to database
    if (props.user && props.user != state.user) {
      this._writeUser(state.db, props.user);
    }
    // if user opens a new arc, touch the key in the user record
    if (props.user && props.key && props.key != state.key) {
      state.key = props.key;
      log(`WRITING into [${props.user.name}].arcs (touching arc)`, props.key);
      // record that the user touched this arc
      state.db.child(`${props.user.id}/arcs/${props.key}`).update({
        touched: firebase.database.ServerValue.TIMESTAMP
      });
    }
  }
  _createUser(db, user) {
    log('WRITING user (createUser)', user);
    // TODO(sjmiles): user in the database doesn't host it's own id field (equivalent to it's key)
    // but the field in RAM does, is this a footgun?
    // Modifying this record after creating it could cause thrash (do we write it again right away?)
    user.id = db.push(user).key;
    return user;
  }
  _writeUser(db, user) {
    log('WRITING user (writeUser)', user);
    db.child(user.id).set(user);
  }
  _watchUser(db, id) {
    const state = this._state;
    return {
      node: db.child(id),
      handler: snap => {
        let user = snap.val();
        log('READ user', user, 'from', String(snap.ref));
        if (!user) {
          console.log(`no remote user (${user}) for id ${id}; user missing from db?`);
          this._fire('user', null);
          return;
        }
        // restore missing fields
        this._repairUser(user, id);
        // cache user for reference checking
        state.user = user;
        // TODO(sjmiles): this is considered a new user record, but it might have the same deep-value
        // relative to what the reciever has. We could test for deep-equality against some cached value.
        this._fire('user', user);
      }
    };
  }
  _repairUser(user, id) {
    user.id = id;
    user.arcs = user.arcs || Xen.nob();
    user.profiles = user.profiles || Xen.nob();
    user.shares = user.shares || Xen.nob();
  }
}
customElements.define('persistent-user', PersistentUser);
