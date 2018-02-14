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
import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';
const db = window.db;

class RemoteSharedHandles extends Xen.Base {
  static get observedAttributes() { return ['arc', 'friends', 'user']; }
  _getInitialState() {
    return {
      group: Object.assign(new WatchGroup(), {db})
    };
  }
  _update(props, state, lastProps) {
    // TODO(sjmiles): rely on invariant that `arc` and `user` are required a-priori for `friends`?
    if (/*props.arc && props.user &&*/ props.friends !== lastProps.friends) {
      let watches = [];
      if (props.friends && props.user) {
        let friends = props.friends.map(friend => friend.rawData);
        // include `user` in friends, so we can access generic profile info this way
        // TODO(sjmiles): is adding 'user' to 'friends' copacetic?
        friends.push({id: props.user.id});
        watches = this._watchFriends(props.arc, friends, props.user, state.groups);
        RemoteSharedHandles.log(`watching (raw) FRIENDS`, friends);
      }
      state.group.watches = watches;
    }
  }
  _watchFriends(arc, friends, user, groups) {
    return friends.map(friend => {
      //RemoteSharedHandles.log(`watching friend's [${friend.id}] shared handles`);
      let group = Object.assign(new WatchGroup(), {db});
      return {
        path: `users/${friend.id}`,
        handler: snap => {
          group.watches = this._watchSharedHandles(arc, user, snap.val());
        },
        group
      };
    });
  }
  _watchSharedHandles(arc, user, sharer) {
    //let remotes = ArcsUtils.getUserProfileKeys(sharer);
    let remotes = ArcsUtils.getUserShareKeys(sharer);
    RemoteSharedHandles.log(`watching [${sharer.name}]'s shared arcs`, remotes);
    return remotes.map(key => {
      return {
        // TODO(sjmiles): path is technically not firebase specific
        // TODO(wkorman): Rename `views` to `handles` below on the next database rebuild.
        path: `arcs/${key}/views`,
        // TODO(sjmiles): firebase knowledge here, maybe push down into watchGroup
        handler: snapshot => this._remoteHandlesChanged(arc, key, snapshot.val(), user, sharer)
      };
    });
  }
  //
  // Level 3: process data form individual handles
  //
  // TODO(sjmiles): need to delete vestigial handles
  _remoteHandlesChanged(arc, arcKey, handles, user, sharer) {
    if (handles) {
      Object.values(handles).forEach(handle => this._remoteHandleChanged(arc, arcKey, user, sharer, handle));
    }
  }
  async _remoteHandleChanged(arc, arcKey, user, sharer, remote) {
    // TODO(sjmiles): hack per berni@ (for descriptions?)
    remote.metadata.name = sharer.name;
    const handle = await ArcsUtils.createOrUpdateHandle(arc, remote, `SHARED[${arcKey}]`);
    const typeName = handle.type.toPrettyString().toLowerCase();
    handle.description = ArcsUtils._getHandleDescription(typeName, handle.tags, user.name, sharer.name);
    RemoteSharedHandles.log(`remoteHandleChanged`, remote.metadata.tags, `"${handle.description}"`);
  }
}
RemoteSharedHandles.log = Xen.Base.logFactory('RemoteSHs', '#c79400');
customElements.define('remote-shared-handles', RemoteSharedHandles);
