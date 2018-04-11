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
import ArcsUtils from '../../lib/arcs-utils.js';
import Xen from '../../../components/xen/xen.js';
import Const from '../../constants.js';
import Firebase from './firebase.js';

const log = Xen.logFactory('CloudArc', '#a30000');
const groupCollapsed = Xen.logFactory('CloudArc', '#a30000', 'groupCollapsed');
const groupEnd = Xen.logFactory('CloudArc', '#a30000', 'groupEnd');

class CloudArc extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() { return ['key', 'metadata', 'description', 'arc', 'plan']; }
  _getInitialState() {
    return {
      watch: new WatchGroup(),
      db: Firebase.db.child('arcs')
    };
  }
  _update({key, arc, metadata, description, plan}, state, oldProps) {
    if (key === '*') {
      if (key !== oldProps.key) {
        this._fire('serialized', null);
        this._fire('key', this._createKey(state.db));
      }
    }
    else if (Const.SHELLKEYS[key]) {
      log('sending empty serialization for non-persistent key');
      this._fire('serialized', '');
    } else if (key) {
      if (plan !== oldProps.plan && key !== 'launcher') {
        log('plan changed, good time to serialize?');
        this._serialize(state.db, key, arc);
      }
      if (key !== oldProps.key) {
        state.watch.watches = [
          {path: `arcs/${key}/metadata`, handler: snap => this._metadataReceived(snap, key)},
          {path: `arcs/${key}/serialized`, handler: snap => this._serializedReceived(snap, key)}
        ];
      }
      if (metadata && description) {
        metadata = this._describeArc(metadata, description);
      }
      if (metadata && metadata !== state.metadata) {
        log('WRITING metadata', metadata);
        state.db.child(`${key}/metadata`).update(metadata);
      }
    }
  }
  _describeArc(metadata, description) {
    if (metadata.description !== description) {
      metadata = Xen.clone(metadata);
      metadata.description = description;
    }
    return metadata;
  }
  async _serialize(db, key, arc) {
    const serialized = await arc.serialize();
    if (serialized !== this._state.serialized) {
      // must cache first, Firebase update can fire callback synchronously
      this._state.serialized = serialized;
      const node = db.child(`${key}/serialized`);
      groupCollapsed('writing serialized arc', String(node));
      log(serialized);
      groupEnd();
      node.set(serialized);
    }
  }
  _serializedReceived(snap, key) {
    log('watch triggered on serialized arc', `${key}/serialized`);
    const serialized = snap.val() || '';
    if (serialized !== this._state.serialized) {
      this._state.serialized = serialized;
      this._fire('serialized', serialized);
    }
  }
  _createKey(db) {
    let data = {
      description: ArcsUtils.randomName(),
      externalManifest: this._getExternalManifest()
    };
    this._assignColors(data);
    const key = db.push({'metadata': data}).key;
    log('_createKey', key);
    return key;
  }
  _getExternalManifest() {
    // Prioritize manifest over solo, semi-arbitrarily, since usually we'll
    // only see one or the other.
    return ArcsUtils.getUrlParam('solo') || ArcsUtils.getUrlParam('manifest');
  }
  _assignColors(metadata) {
    let bgs =/**/['#5EF4BD', '#20E7FF', '#607D8B', '#FF7364', '#2FADE6', '#FFB843', '#FFF153', '#17C497'];
    let colors = ['#212121', '#212121', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#212121', '#212121', '#FFFFFF'];
    let choice = Math.floor(Math.random()*colors.length);
    metadata.color = colors[choice];
    metadata.bg = bgs[choice];
  }
  _metadataReceived(snap, key) {
    log('watch triggered on metadata', `${key}/metadata`);
    const metadata = snap.val();
    this._state.metadata = metadata;
    this._fire('metadata', metadata);
  }
}
customElements.define('cloud-arc', CloudArc);
