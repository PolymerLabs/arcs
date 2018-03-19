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
import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';
const db = window.db;

const log = Xen.Base.logFactory('PersistentArc', '#a30000');

class PersistentArc extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() { return ['key', 'metadata']; }
  _getInitialState() {
    return {
      watch: new WatchGroup(),
      db: db.child('arcs')
    };
  }
  // Allow overriding search params for unit tests.
  _getSearchParams() {
    return (new URL(document.location)).searchParams;
  }
  _getExternalManifest() {
    const params = this._getSearchParams();
    // Prioritize manifest over solo, semi-arbitrarily, since usually we'll
    // only see one or the other.
    return params.get('solo') || params.get('manifest');
  }
  _update({key, metadata}, state, lastProps) {
    if (key === '*' && lastProps.key != key) {
      this._createKey(state.db);
    }
    if (key && key !== '*') {
      if (key !== lastProps.key) {
        state.watch.watches = [this._watchKey(state.db, key)];
      }
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
        }
        if (this._hasMetadataChanged(metadata)) {
          log('WRITING (update) metadata', metadata);
          state.db.child(key).child('metadata').update(metadata);
        }
      }
      this._fire('key', key);
    }
  }
  _hasMetadataChanged(metadata) {
    const state = this._state;
    const serial = JSON.stringify(metadata);
    if (serial !== state.serial) {
      log('metadata changed');
      //PersistentArc.groupCollapsed('metadata changed');
      //  log('new meta:', metadata); //serial);
      //  log('old meta:', state.serial ? JSON.parse(state.serial) : state.serial);
      //console.groupEnd();
      state.serial = serial;
      return true;
    }
  }
  _createKey(db) {
    let data = {
      description: ArcsUtils.randomName(),
      externalManifest: this._getExternalManifest()
    };
    this._assignColors(data);
    let key = db.push({'metadata': data}).key;
    this._setState({key});
    log('providing key (_createKey)', key);
    this._fire('key', key);
  }
  _assignColors(metadata) {
    let bgs = ['#5EF4BD', '#20E7FF', '#607D8B', '#FF7364', '#2FADE6', '#FFB843', '#FFF153', '#17C497'];
    let colors = ['#212121', '#212121', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#212121', '#212121', '#FFFFFF'];
    let choice = Math.floor(Math.random()*colors.length);
    metadata.color = colors[choice];
    metadata.bg = bgs[choice];
  }
  _watchKey(db, key) {
    let arcMetadata = db.child(key).child('metadata');
    log('watching', String(arcMetadata));
    const state = this._state;
    return {
      node: arcMetadata,
      handler: snap => {
        log('watch fired on current arc metadata', String(arcMetadata));
        let metadata = snap.val();
        if (this._hasMetadataChanged(metadata)) {
          log('installing new remote metadata', metadata);
          this._fire('metadata', metadata);
        }
      }
    };
  }
}
customElements.define('persistent-arc', PersistentArc);
