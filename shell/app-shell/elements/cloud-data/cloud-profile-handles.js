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

const log = Xen.logFactory('CloudProfileHandles', '#003c8f');

class CloudProfileHandles extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['arc', 'user', 'arcs'];
  }
  _getInitialState() {
    return {
      watch: new WatchGroup()
    };
  }
  _update({arc, arcs}, state, oldProps) {
    if (arc && arcs && (arc !== oldProps.arc || arcs !== oldProps.arcs)) {
      state.watch.watches = this._collateHandleWatches(arc, arcs);
    }
  }
  _collateHandleWatches(arc, arcs) {
    const watches = [];
    Object.keys(arcs).forEach(key => {
      const {metadata} = arcs[key];
      if (metadata && metadata.share >= Const.SHARE.friends) {
        log(`[${key}] contains shared handles`);
        watches.push({
          path: `arcs/${key}/${Const.DBLABELS.handles}`,
          handler: snap => this._handlesChanged(arc, key, snap)
        });
      }
    });
    return watches;
  }
  _handlesChanged(arc, key, snap) {
    const handles = snap.val();
    log(`handlesChanged [${key}]`, handles);
    if (handles) {
      Object.keys(handles).forEach(async id => {
        const handle = await this._createOrUpdateHandle(arc, `${Const.HANDLES.profile}_${id}`, `${Const.HANDLES.profile}_${id}`, handles[id]);
        log('created/updated handle', handle.id);
        this._fire('profile', handle);
      });
    }
  }
  async _createOrUpdateHandle(arc, id, tag, handleInfo) {
    const {metadata, data} = handleInfo;
    // construct type object
    const type = ArcsUtils.typeFromMetaType(metadata.type);
    // find or create a handle in the arc context
    const handle = await ArcsUtils._requireHandle(arc, type, metadata.name, id, [tag]);
    const typeName = handle.type.toPrettyString().toLowerCase();
    handle.description = ArcsUtils._getHandleDescription(typeName, handle.tags, 'user', 'user');
    await ArcsUtils.setHandleData(handle, data);
    return handle;
  }
}
customElements.define('cloud-profile-handles', CloudProfileHandles);
