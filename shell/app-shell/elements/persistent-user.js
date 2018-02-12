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

(scope => {
  class PersistentUser extends Xen.Base {
    static get observedAttributes() { return ['id','user','key']; }
    _getInitialState() {
      return {
        watch: new WatchGroup(),
        db: db.child('users')
      };
    }
    _update(props, state, lastProps, lastState) {
      // if we have acquired a user that doesn't match the current request, discard the user
      if (state.user && state.user.id !== props.id) {
        state.user = null;
      }
      // if there's no id, create a new user from input record
      if (!props.id && props.user && props.user.name && props.user !== lastProps.user) {
        state.user = this._createUser(state.db, props.user);
      }
      // if we have an id and user has mutated, write the mutations to the database
      if (props.id && props.user && props.user !== state.user && props.user !== lastProps.user) {
        PersistentUser.log('WRITING user', props.user, state.user);
        state.db.child(props.user.id).set(props.user);
      }
      // if we have a novel id, watch the user data in the database
      if (props.id && props.id !== lastProps.id) {
        PersistentUser.log('WATCHING user', props.id);
        state.watch.watches = [this._watchUser(state.db, props.id)];
      }
      // TODO(sjmiles): none of this `key` stuff should be in this module
      // if we have a fresh (current Arc) key, store it for processing when we have a user
      if (props.key !== lastProps.key) {
        state.key = props.key;
      }
      // if we have a key to process and a user, then...
      if (state.key && state.user) {
        PersistentUser.log(`WRITING into [${state.user.name}].arcs`, state.key);
        // record that the user touched this arc
        state.db.child(`${state.user.id}/arcs/${state.key}`).update({
          touched: firebase.database.ServerValue.TIMESTAMP
        });
        // done processing key
        state.key = '';
      }
      // always upstream user
      this._fire('user', state.user);
    }
    _createUser(db, user) {
      PersistentUser.log('WRITING user (createUser)', user);
      // TODO(sjmiles): user in the database doesn't host it's own id field (equivalent to it's key)
      // but the field in RAM does, is this a footgun? Hosting the id field in the database requires
      // two writes which causes observer thrash.
      user.id = db.push(user).key;
      return user;
    }
    _watchUser(db, id) {
      return {
        node: db.child(id),
        handler: snap => {
          let user = snap.val();
          if (user) {
            user.id = id;
          }
          PersistentUser.log('READING user (watchUser)', user, 'from', String(snap.ref));
          this._setState({user});
        }
      };
    }
  }
  PersistentUser.log = Xen.Base.logFactory('PersistentUser', '#65499c');
  customElements.define('persistent-user', PersistentUser);
})(this);
