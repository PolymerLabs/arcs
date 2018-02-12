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

class PersistentManifests extends Xen.Base {
  static get observedAttributes() { return ['manifests','exclusions']; }
  _getInitialState() {
    return {
      group: new WatchGroup(),
      db: db.child('manifests'),
      exclusions: this._readExclusions()
    };
  }
  _didMount() {
    this._fire('exclusions', this._state.exclusions);
  }
  _update(props, state, lastProps) {
    if (!state.connected) {
      state.connected = true;
      this._connect(state.db, state.group);
    }
    if (props.manifests && state.manifests !== props.manifests && props.manifests !== lastProps.manifests) {
      state.manifests = props.manifests;
      PersistentManifests.log('WRITING', state.manifests);
      state.db.set(state.manifests);
    }
    if (props.exclusions && props.exclusions !== state.exclusions) {
      state.exclusions = props.exclusions;
      this._writeExclusions(state.exclusions);
    }
  }
  async _connect(node, group) {
    PersistentManifests.log('watching', String(node));
    group.watches = [{
      node: node,
      handler: snap => {
        let manifests = (snap.val() || []).filter(m => Boolean(m));
        PersistentManifests.log('READING', manifests);
        this._state.manifests = manifests;
        this._fire('manifests', manifests);
      }
    }];
  }
  _readExclusions() {
    try {
      return JSON.parse(localStorage.getItem('0-3-arcs-exclusions') || '[]');
    } catch(x) {
      console.warn(x);
      return [];
    }
  }
  _writeExclusions(exclusions) {
    localStorage.setItem('0-3-arcs-exclusions', JSON.stringify(exclusions));
  }
}
PersistentManifests.log = Xen.Base.logFactory('PersistentManifests', '#883997');
customElements.define('persistent-manifests', PersistentManifests);
