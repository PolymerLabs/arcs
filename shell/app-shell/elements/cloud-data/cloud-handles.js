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

const log = Xen.logFactory('CloudHandles', '#aa00c7');
const warn = Xen.logFactory('CloudHandles', '#aa00c7', 'warn');

class CloudHandles extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'arc', 'plans'];
  }
  _getInitialState() {
    return {
      roots: {},
      watches: {}
    };
  }
  _willReceiveProps({key, arc}, {roots, watches}, oldProps, oldState) {
    if (oldProps.key && key !== oldProps.key) {
      this._disposeWatches(watches);
    }
    if (key && arc && !Const.SHELLKEYS[key]) {
      this._scanHandles(key, arc, roots);
    }
  }
  _scanHandles(key, arc, roots) {
    const paths = {};
    [...arc._storeTags].forEach(tagEntry => this._handleToPath(paths, key, tagEntry));
    this._updateWatches(arc, roots, paths);
  }
  _handleToPath(paths, key, [localHandle, tags]) {
    if (tags && tags.size > 0 && !tags.has('#nosync')) {
      const contextId = ArcsUtils.getContextHandleId(localHandle.type, tags);
      const path = `arcs/${key}/${Const.DBLABELS.handles}/${contextId}`;
      paths[path] = localHandle;
    }
  }
  _updateWatches(arc, roots, paths) {
    // remove paths that are already watched and remove watches that are not paths
    Object.keys(roots).forEach(path => {
      if (paths[path]) {
        delete paths[path];
      } else {
        const handle = paths[path];
        if (handle.type.isCollection) {
          this._unwatchSet(path);
        } else {
          this._unwatchVariable(path);
        }
      }
    });
    // add watches for remaining paths
    Object.keys(paths).forEach(path => {
      const handle = paths[path];
      if (handle.type.isCollection) {
        this._watchSet(arc, path, handle);
      } else {
        this._watchVariable(arc, path, handle);
      }
    });
  }
  // variables
  _unwatchVariable(path) {
    this._removeWatch(`${path}/data`, 'value');
  }
  _watchVariable(arc, path, handle) {
    Firebase.db.child(`${path}/metadata`).set({
      type: ArcsUtils.metaTypeFromType(handle.type)
    });
    const handler = this._remoteVariableChange(arc, path, handle);
    this._addWatch(`${path}/data`, 'value', handler);
  }
  _remoteVariableChange(arc, path, handle) {
    // Ensure we get at least one response from Firebase before
    // we start writing back.
    let initialized = false;
    let remoteValue;
    // actual handler is here
    return snap => {
      log(`remote handle change [${path}]`);
      remoteValue = snap.val();
      if (!initialized) {
        initialized = true;
        handle.on('change', change => this._localVariableChange(handle, path, change, remoteValue), arc);
      }
      handle.set(remoteValue);
    };
  }
  _localVariableChange(handle, path, change, remoteValue) {
    if (change.data !== remoteValue) {
      log(`local handle change [${path}]`, change.data);
      const node = Firebase.db.child(`${path}/data`);
      node.set(change.data ? ArcsUtils.removeUndefined(change.data) : null);
    } else {
      //log('ignoring local change');
    }
  }
  // sets
  _unwatchSet(path) {
    this._removeWatch(`${path}/data`, 'child_added');
    this._removeWatch(`${path}/data`, 'child_removed');
  }
  _watchSet(arc, path, handle) {
    Firebase.db.child(`${path}/metadata`).set({
      type: ArcsUtils.metaTypeFromType(handle.type)
    });
    const dataPath = `${path}/data`;
    Firebase.db.child(dataPath).once('value', snap => {
      handle.on('change', change => this._localSetChange(handle, path, change), arc);
      this._addWatch(dataPath, 'child_added', snap => this._remoteSetChildAdded(snap, arc, path, handle));
      this._addWatch(dataPath, 'child_removed', snap => this._remoteSetChildRemoved(snap, arc, path, handle));
    });
  }
  async _remoteSetChildAdded(snap, arc, path, handle) {
    const entity = snap.val();
    log('trigger: remote add', entity);
    // doesn't trigger an `add` event if `entity` is already in `handle`
    handle.store(entity);
    log('remote add result', await handle.toList());
  }
  async _remoteSetChildRemoved(snap, arc, path, handle) {
    const entity = snap.val();
    log('trigger: remote remove', entity);
    // doesn't trigger a `remove` event if `entity` is not part of `handle`
    handle.remove(entity);
    log('remote remove result', await handle.toList());
  }
  _localSetChange(handle, path, change, remoteValue) {
    log('localSetChange', change);
    if (change.add) {
      change.add.forEach(record => {
        log('trigger: local add', record);
        Firebase.db.child(`${path}/data/${record.id}`).set(ArcsUtils.removeUndefined(record));
      });
    } else if (change.remove) {
      change.remove.forEach(record => {
        log('trigger: local remove', record);
        Firebase.db.child(`${path}/data/${record.id}`).remove();
      });
    } else {
      warn('Unsupported "handle.change" event', change);
    }
  }
  // low-level
  _addWatch(path, kind, handler) {
    const id = `${path}::${kind}`;
    const {watches} = this._state;
    const watch = watches[id];
    if (!watch) {
      log(`watching [${id}]`);
      watches[id] = Firebase.db.child(path).on(kind, handler);
    }
  }
  _removeWatch(path, kind) {
    const id = `${path}::${kind}`;
    const {watches} = this._state;
    const watch = watches[id];
    if (watch) {
      log(`unwatching [${id}]`);
      Firebase.db.child(path).off(kind, watch);
      delete watches[id];
    }
  }
  _disposeWatches(watches) {
    log('_disposeWatches');
    Object.keys(watches).forEach(id => {
      const [path, kind] = id.split('::');
      Firebase.db.child(path).off(kind, watches[id]);
    });
    this._setState({watches: {}});
  }
}
customElements.define('cloud-handles', CloudHandles);
