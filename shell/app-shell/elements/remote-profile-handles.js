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
import ArcsUtils from "../lib/arcs-utils.js";
import Xen from '../../components/xen/xen.js';
const db = window.db;

class RemoteProfileHandles extends Xen.Base {
  static get observedAttributes() { return ['arc', 'user']; }
  _getInitialState() {
    return {
      group: Object.assign(new WatchGroup(), {db})
    };
  }
  _update(props, state, lastProps) {
    if (props.user && props.user !== lastProps.user) {
      state.user = props.user;
    }
    if (props.arc && state.user) {
      state.user = null;
      state.group.watches = this._watchProfileHandles(props.user, props.arc, state.friends);
    }
  }
  _watchProfileHandles(user, arc, friends) {
    let profiles = ArcsUtils.getUserProfileKeys(user);
    return profiles.map(key => {
      return {
        // TODO(sjmiles): path is technically not firebase specific
        // TODO(wkorman): Rename `views` to `handles` below on the next database rebuild.
        path: `arcs/${key}/views`,
        // TODO(sjmiles): firebase knowledge here
        handler: snapshot => this._remoteHandlesChanged(arc, friends, snapshot.key, snapshot.val())
      };
    });
  }
  _remoteHandlesChanged(arc, friends, key, remotes) {
    if (remotes) {
      // TODO(sjmiles): `remotes` are remote-fb-nodes-describing-a-handle ... cow needs a name
      RemoteProfileHandles.log(`READING handles`, remotes);
      Object.keys(remotes).forEach(async key => {
        // TODO(sjmiles): `key` used to mean `amkey`, at some point I accidentally started sending _handle_ keys
        // but nothing broke ... I assume this was not injurious because these data are remote and not persistent
        let handle = await ArcsUtils.createOrUpdateHandle(arc, remotes[key], 'PROFILE');
        RemoteProfileHandles.log('created/updated handle', handle.id);
        this._fire('profile', handle);
      });
    }
  }
}
RemoteProfileHandles.log = Xen.Base.logFactory('RemotePHs', '#003c8f');
customElements.define('remote-profile-handles', RemoteProfileHandles);
