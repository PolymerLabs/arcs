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
import Firebase from './firebase.js';

const log = Xen.logFactory('WatchGroup', '#aa00c7');

class WatchGroup extends Xen.Base {
  static get observedAttributes() {
    return ['watches', 'db'];
  }
  // TODO(sjmiles): a sign that this shouldn't be an Element at all
  static create(initializedCallback) {
    return Object.assign(new WatchGroup(), {initializedCallback});
  }
  _getInitialState() {
    return {
      plugs: new Set(),
      initializedCallback: () => {}
    };
  }
  _update(props, state, lastProps) {
    state.db = props.db || Firebase.db;
    if (props.watches !== lastProps.watches) {
      this._unplug(state.plugs);
      state.initialized = false;
      state.callbacksFired = 0;
      this._watchAll(state.db, props.watches, state.plugs);
    }
  }
  _unplug(plugs) {
    plugs.forEach(pull => pull());
    plugs.clear();
  }
  _watchAll(db, watches, plugs) {
    if (watches) {
      for (const watch of watches) {
        this._watchOne(db, watch, plugs);
      }
    }
  }
  _watchOne(db, watch, plugs) {
    let pull = watch.path ? this._watchPath(db, watch) : this._watchNode(watch.node, watch.handler);
    // for nested watches, if we pull the plug on this watch, pull the plug on nested group too
    // note that it's `watch.handler`'s job to install watches into `watch.group`, we only do clean-up
    if (watch.group) {
      let off = pull;
      pull = () => {
        off();
        watch.group.watches = null;
      };
    }
    plugs.add(pull);
  }
  _watchPath(db, {path, handler, group}) {
    let node = db.child(path);
    return this._watchNode(node, handler);
  }
  _watchNode(node, handler) {
    WatchGroup.watchCount++;
    let handle = node.on('value', snap => {
      const state = this._state;
      if (++state.callbacksFired === state.plugs.length) {
        state.initialized = true;
        state.initializedCallback();
      }
      handler(snap);
    });
    return () => {
      node.off('value', handle);
      WatchGroup.watchCount--;
    };
  }
}
WatchGroup.watchCount = 0;
customElements.define('watch-group', WatchGroup);

export default WatchGroup;
