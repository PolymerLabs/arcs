/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';

class WatchGroup extends Xen.Base {
  static get observedAttributes() { return ['watches','db']; }
  add(watches) {
    this._watchAll(this._props.db, watches, this._state.plugs);
  }
  _getInitialState() {
    return {
      plugs: new Set()
    };
  }
  _update(props, state, lastProps) {
    if (props.watches !== lastProps.watches) {
      this._unplug(state.plugs);
      this._watchAll(props.db, props.watches, state.plugs);
    }
  }
  _unplug(plugs) {
    plugs.forEach(pull => pull());
    plugs.clear();
  }
  _watchAll(db, watches, plugs) {
    if (watches) {
      for (let watch of watches) {
        let pull = watch.path ? this._watchPath(db, watch) : this._watch(watch.node, watch.handler);
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
      //WatchGroup.log("total watches", WatchGroup.watchCount);
    }
  }
  _watchPath(db, {path, handler, group}) {
    let node = db.child(path);
    return this._watch(node, handler);
  }
  _watch(node, handler) {
    WatchGroup.watchCount++;
    let handle = node.on('value', handler);
    return () => {
      node.off('value', handle);
      WatchGroup.watchCount--;
      //WatchGroup.log("total watches", WatchGroup.watchCount);
    };
  }
}
WatchGroup.watchCount = 0;
WatchGroup.log = Xen.Base.logFactory('WatchGroup', '#aa00c7');
customElements.define('watch-group', WatchGroup);

export default WatchGroup;
