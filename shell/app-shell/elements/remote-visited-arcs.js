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

class RemoteVisitedArcs extends Xen.Base {
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
      RemoteVisitedArcs.log(`watching visited arcs`);
      // build an object for mapping arc keys to arc metadata
      let data = Object.create(null);
      // user.arcs contains arc keys
      return Object.keys(user.arcs).map(key => {
        return {
          node: db.child(`arcs/${key}/`),
          handler: snap => this._watchHandler(data, user, snap)
        }
      });
    } else {
      this._fire('arcs', []);
    }
  }
  _watchHandler(data, user, snap) {
    // arc metadata record
    let record = snap.val();
    // there should always be a record, but the DB might be damaged
    if (record) {
      // if this arc is part of our profile, mark it that way
      if (user.profiles && user.profiles[snap.key]) {
        record.profile = snap.key;
      }
      // stuff this record into our list of arc metadata
      data[snap.key] = record;
      RemoteVisitedArcs.log('READING (_watchHandler)', data);
      // produce our deliverable
      this._fire('arcs', data);
    }
  }
  _updateVisitedArcs(arcs, user) {
    // update list of visited arcs (`user.arcs`) to match input list (`arcs`, minus New Arc [*])
    let keys = arcs.map(a => a.rawData.key).filter(key => key != '*');
    // no-op if data matches
    // right now the only change we support is removal, so length check is enough
    if (user.arcs && keys.length !== Object.keys(user.arcs).length) {
      //RemoteVisitedArcs.log('updateVisitedArcs', keys, user.arcs);
      let visited = Object.create(null);
      keys.forEach(key => {
        let arc = user.arcs[key];
        if (arc) {
          visited[key] = arc;
        }
      });
      RemoteVisitedArcs.log('WRITING (updateVisitedArcs)', visited);
      // TODO(sjmiles): turned off when revealed buggy just before demo, fix
      // to support deleting of Arcs from visited list
      db.child(`users/${user.id}/arcs`).set(visited);
    }
  }
}
RemoteVisitedArcs.log = Xen.Base.logFactory('RemoteVisitedArcs', '#00796b');
customElements.define('remote-visited-arcs', RemoteVisitedArcs);
