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
  static get observedAttributes() { return ['config', 'key', 'metadata', 'description', 'share', 'arc', 'plan']; }
  _getInitialState() {
    return {
      watch: new WatchGroup(),
      db: Firebase.db.child('arcs')
    };
  }
  _willReceiveProps({config, key, arc, metadata, description, share, plan}, state, oldProps) {
    if (key === '*') {
      if (key !== oldProps.key) {
        this._fire('serialization', null);
        this._fire('key', this._createKey(state.db));
      }
    }
    else if (Const.SHELLKEYS[key]) {
      log('sending empty serialization for non-persistent key');
      this._fire('serialization', '');
    }
    else if (key) {
      if (key !== oldProps.key) {
        state.serialization = null;
        state.watch.watches = [
          {path: `arcs/${key}/metadata`, handler: snap => this._metadataReceived(snap, key)},
          {path: `arcs/${key}/serialization`, handler: snap => this._serializationReceived(snap, key)}
        ];
      }
      if (plan && plan !== oldProps.plan && !Const.SHELLKEYS[key] && config.useStorage) {
        log('plan changed, good time to serialize?');
        this._serialize(state.db, key, arc);
      }
      if (metadata && share && share !== oldProps.share && metadata.share !== share) {
        metadata.share = share;
        state.metadata = null;
      }
      if (metadata && description && description !== oldProps.description && metadata.description !== description) {
        metadata.description = description;
        state.metadata = null;
      }
      if (metadata && metadata !== state.metadata) {
        log('WRITING metadata', metadata);
        state.db.child(`${key}/metadata`).update(metadata);
      }
    }
  }
  async _serialize(db, key, arc) {
    const serialization = await arc.serialize();
    if (this._props.arc && serialization !== this._state.serialization) {
      // must cache first, Firebase update can fire callback synchronously
      this._state.serialization = serialization;
      const node = db.child(`${key}/serialization`);
      groupCollapsed('writing arc serialization', String(node));
      log(serialization);
      groupEnd();
      node.set(serialization);
    }
  }
  _serializationReceived(snap, key) {
    log('watch triggered on arc serialization', `${key}/serialization`);
    const serialization = snap.val() || '';
    if (serialization !== this._state.serialization) {
      this._state.serialization = serialization;
      this._fire('serialization', serialization);
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
    const metadata = snap.val() || {};
    this._state.metadata = metadata;
    this._fire('metadata', metadata);
    const share = metadata.share || Const.SHARE.private;
    this._fire('share', share);
  }
}
customElements.define('cloud-arc', CloudArc);
