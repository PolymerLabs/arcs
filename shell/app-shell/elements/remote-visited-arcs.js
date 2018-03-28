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

const log = Xen.logFactory('RemoteVisitedArcs', '#00796b');

class RemoteVisitedArcs extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() { return ['user', 'arcs']; }
  _getInitialState() {
    return {
      watch: new WatchGroup()
    };
  }
  _update(props, state, lastProps) {
     if (props.user != lastProps.user) {
      // disable old watches, enable fresh ones as needed
      state.watch.watches = this._watchVisitedArcs(props.user);
    }
    if (props.arcs !== lastProps.arcs) {
      this._updateVisitedArcs(props.arcs, props.user);
    }
  }
  _watchVisitedArcs(user) {
    if (user && user.arcs) {
      log(`watching visited arcs`);
      // build an object for mapping arc keys to arc metadata
      let arcs = Object.create(null);
      // user.arcs contains arc keys
      return Object.keys(user.arcs).map(key => {
        return {
          node: db.child(`arcs/${key}/`),
          handler: snap => this._watchHandler(arcs, user, snap)
        };
      });
    } else {
      this._fire('arcs', []);
    }
  }
  _watchHandler(arcs, user, snap) {
    // arc metadata record
    let record = snap.val();
    // there should always be a record, but the DB might be damaged
    if (record) {
      // if this arc is part of our profile, mark it that way
      if (user.profiles && user.profiles[snap.key]) {
        record.profile = snap.key;
      }
      // stuff this record into our list of arc metadata
      arcs[snap.key] = record;
      log('READING (_watchHandler)', arcs);
      // produce our deliverable
      this._fire('arcs', arcs);
    }
  }
  _updateVisitedArcs(arcs, user) {
    if (user.arcs) {
      let dirty = false;
      const keys = arcs.map(a => a.rawData.key);
      arcs.forEach(arc => {
        if (arc.rawData.deleted) {
          log('arc marked for deletion, removing from user arcs', arc);
          delete user.arcs[arc.rawData.key];
          dirty = true;
        }
      });
      if (dirty) {
        log('WRITING (updateVisitedArcs)', user.arcs);
        db.child(`users/${user.id}/arcs`).set(user.arcs);
      }
    }
  }
}
customElements.define('remote-visited-arcs', RemoteVisitedArcs);
