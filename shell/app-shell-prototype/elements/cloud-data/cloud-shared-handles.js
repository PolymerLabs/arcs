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
import Firebase from './firebase.js';
import Const from '../../constants.js';
import ArcsUtils from '../../lib/arcs-utils.js';
import Xen from '../../../components/xen/xen.js';

const log = Xen.logFactory('CloudSharedHandles', '#3c008f');

class CloudSharedHandles extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['arc', 'userid', 'profile'];
  }
  _getInitialState() {
    return {
      watcher: new WatchGroup(),
      watches: {}
    };
  }
  _update({userid, profile, arc}, state, oldProps) {
    if (profile && oldProps.profile !== profile) {
      if (state.friends !== profile.friends) {
        log('rebuilding handle watches');
        state.friends = profile.friends;
        this._disposeWatches();
        state.watcher.watches = this._watchUsers(arc, state.friends.map(friend => friend.id).concat([userid]));
      }
    }
  }
  _watchUsers(arc, users) {
    return users.map(user => {
      const path = `users/${user}/arcs`;
      log(`watching [${path}]`);
      const watched = {};
      return {
        path,
        handler: snap => this._userArcsChanged(arc, watched, user, snap)
      };
    });
  }
  _userArcsChanged(arc, watched, user, snap) {
    const arcs = snap.val();
    if (arcs) {
      const arcPath = key => `arcs/${key}`;
      // remove watches for keys that are no longer live
      Object.keys(watched).forEach(key => {
        if (!arcs[key]) {
          log(`unwatching ${key}`);
          this._removeWatch(arcPath(key));
          if (watched[key]) {
            Object.keys(watched[key]).forEach(key => this._removeWatch(key));
          }
          // TODO(sjmiles): remove handles also
        }
      });
      // add watches for live keys
      Object.keys(arcs).forEach(key => {
        watched[key] = {};
        const path = arcPath(key);
        log(`watching [${path}] for [${user}]`);
        this._addWatch(path, 'value', snap => this._arcChanged(arc, watched[key], user, key, snap));
      });
    }
  }
  _arcChanged(arc, watched, user, key, snap) {
    log('arcChanged', key);
    const data = snap.val();
    const {metadata} = data;
    if (metadata) {
      const path = `arcs/${key}/${Const.DBLABELS.handles}`;
      if (metadata && metadata.share > Const.SHARE.private) {
        log(`[${key}] contains shared handles`);
        watched[path] = true;
        this._addWatch(path, 'value', snap => this._handlesChanged(arc, user, key, snap));
      }
    }
  }
  _handlesChanged(arc, user, key, snap) {
    const handles = snap.val();
    Object.keys(handles).forEach(async id => {
      const handle = await this._createOrUpdateHandle(arc, ArcsUtils.randomId(), `#${id}`, handles[id]);
      //const handle = await this._createOrUpdateHandle(arc, `$shared_${id}`, `#${id}`, handles[id]);
      this._fire('shared', {user, handle});
    });
  }
  async _createOrUpdateHandle(arc, id, tag, handleInfo) {
    const {metadata, data} = handleInfo;
    // construct type object
    const type = ArcsUtils.typeFromMetaType(metadata.type);
    // find or create a handle in the arc context
    const handle = await ArcsUtils._requireHandle(arc, type, metadata.name, id, [tag]);
    await ArcsUtils.setHandleData(handle, data);
    log('created/updated handle', handle.id, data);
    return handle;
  }
  // low-level
  _addWatch(path, kind, handler) {
    const {watches} = this._state;
    const id = `${kind}::${path}`;
    const watch = watches[id];
    if (!watch) {
      //log(`watching [${id}]`);
      watches[id] = Firebase.db.child(path).on(kind, handler);
    }
  }
  _removeWatch(path, kind) {
    kind = kind || 'value';
    const {watches} = this._state;
    const id = `${kind}::${path}`;
    const watch = watches[id];
    if (watch) {
      log(`unwatching [${id}]`);
      Firebase.db.child(path).off(kind, watch);
      delete watches[id];
    }
  }
  _disposeWatches() {
    //log('_disposeWatches');
    const {watches} = this._state;
    Object.keys(watches).forEach(id => {
      const [kind, path] = id.split('::');
      Firebase.db.child(path).off(kind, watches[id]);
    });
    this._setState({watches: {}});
  }
}
customElements.define('cloud-shared-handles', CloudSharedHandles);
