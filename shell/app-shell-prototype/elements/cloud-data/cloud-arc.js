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
const db = window.db;

const log = Xen.logFactory('CloudArc', '#a30000');
const groupCollapsed = Xen.logFactory('CloudArc', '#a30000', 'groupCollapsed');
const groupEnd = Xen.logFactory('CloudArc', '#a30000', 'groupEnd');

class CloudArc extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() { return ['key', 'metadata', 'arc', 'plan']; }
  _getInitialState() {
    return {
      watch: new WatchGroup(),
      db: db.child('arcs')
    };
  }
  _update({key, arc, metadata, plan}, state, oldProps) {
    if (plan !== oldProps.plan) {
      log('plan changed, good time to serialize?');
      this._serialize(state.db, key, arc);
    }
    if (key === '*' && key !== oldProps.key) {
      this._fire('key', this._createKey(state.db));
    }
    if (key && key !== '*' && key !== 'launcher') {
      if (key !== oldProps.key) {
        state.watch.watches = [
          {path: `arcs/${key}/metadata`, handler: snap => this._metadataReceived(snap, key)},
          {path: `arcs/${key}/serialized`, handler: snap => this._serializedReceived(snap, key)}
        ];
      }
      /*
      if (metadata) {
        // Typical developer workflow involves creating a new arc and
        // subsequently modifying the url to include a specific recipe via a
        // solo or manifest query param, thus we have to look for such a param
        // at arc update time. Alternatively we could have the developer
        // include the param in the main launcher page and have the app shell
        // pass it along to the 'New Arc' url, but that is not the current
        // state of the world.
        const externalManifest = this._getExternalManifest();
        if (externalManifest != metadata.externalManifest) {
          metadata.externalManifest = externalManifest;
          state.metadata = null;
          //this._fire('metadata', metadata);
        }
      }
      */
      if (metadata !== state.metadata) {
        //this._reviseMetadata(metadata);
        //state.metadata = metadata;
        log('WRITING metadata', metadata);
        state.db.child(`${key}/metadata`).update(metadata);
      }
    }
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
  _assignColors(metadata) {
    let bgs =/**/['#5EF4BD', '#20E7FF', '#607D8B', '#FF7364', '#2FADE6', '#FFB843', '#FFF153', '#17C497'];
    let colors = ['#212121', '#212121', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#212121', '#212121', '#FFFFFF'];
    let choice = Math.floor(Math.random()*colors.length);
    metadata.color = colors[choice];
    metadata.bg = bgs[choice];
  }
  // _reviseMetadata(metadata) {
  //   metadata.rev = (metadata.rev || 0) + 1;
  // }
  _metadataReceived(snap, key) {
    log('watch triggered on metadata', `${key}/metadata`);
    const metadata = snap.val();
    //if (this._hasMetadataChanged(metadata)) {
      //log('remote metadata changed', metadata);
      this._state.metadata = metadata;
      this._fire('metadata', metadata);
    //}
  }
  // _hasMetadataChanged(metadata) {
  //   const state = this._state;
  //   if (!state.metadata || (metadata.rev > state.metadata.rev)) {
  //     return true;
  //   }
  // }
  _getExternalManifest() {
    // Prioritize manifest over solo, semi-arbitrarily, since usually we'll
    // only see one or the other.
    return ArcsUtils.getUrlParam('solo') || ArcsUtils.getUrlParam('manifest');
  }
  _serializedReceived(snap, key) {
    log('watch triggered on serialized arc', `${key}/serialized`);
    const serialized = snap.val() || '';
    if (serialized !== this._state.serialized) {
      this._state.serialized = serialized;
      this._fire('serialized', serialized);
    }
  }
}
customElements.define('cloud-arc', CloudArc);
