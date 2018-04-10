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
import ArcsUtils from '../../lib/arcs-utils.js';
import Firebase from './firebase.js';
import WatchGroup from './watch-group.js';

const log = Xen.logFactory('CloudUser', '#772987');

class CloudUser extends Xen.Debug(Xen.Base, log) {
  _getInitialState() {
    return {
      watch: new WatchGroup()
    };
  }
  _update(props, state, lastProps) {
    state.watch.watches = [{
      path: `arcs`,
      handler: snap => this._arcsChanged(snap)
    }];
  }
  _arcsChanged(snap) {
    const arcs = snap.val();
    log('/arcs node fired a change event');
    this._fire('arcs', arcs);
  }
}
customElements.define('cloud-user', CloudUser);
