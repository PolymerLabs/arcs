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
import ArcsUtils from '../../lib/arcs-utils.js';
import Xen from '../../../components/xen/xen.js';

const log = Xen.logFactory('CloudHandles', '#aa00c7');

class CloudHandles extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'arc', 'suggestions'];
  }
  _getInitialState() {
    return {
      handles: new WatchGroup()
    };
  }
  _willReceiveProps({key, arc}, state, oldProps, oldState) {
    //if (key && arc && (key !== oldProps.key || arc !== oldProps.arc)) {
      log('Watching handles');
      //state.handles.watches =
      this._watchHandles(arc, state);
    //}
  }
  _watchHandles(arc, state) {
    return [...arc._handleTags].map(tagEntry => this._watchHandle(arc, state, tagEntry));
  }
  _watchHandle(arc, state, [localHandle, tags]) {
    log(`examining handle `, localHandle);
    if (!tags || tags.size == 0 || tags.has('#nosync')) {
      log(`localHandle not set up for persistence (has no tags, or has #nosync)`);
      return;
    }
    const handleId = ArcsUtils.getContextHandleId(localHandle.type, tags);
    log(`calculated handleId:`, handleId);
  }
}
customElements.define('cloud-handles', CloudHandles);
