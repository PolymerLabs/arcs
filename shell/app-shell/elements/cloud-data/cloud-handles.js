/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import Xen from '../../../components/xen/xen.js';
import ArcsUtils from '../../../lib/arcs-utils.js';
import Firebase from '../../../lib/firebase.js';
import Const from '../../../lib/constants.js';

const log = Xen.logFactory('CloudHandles', '#aa00c7');
const warn = Xen.logFactory('CloudHandles', '#aa00c7', 'warn');
const originatorId = 'cloud-handles';

class CloudHandles extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'key', 'arc', 'plans'];
  }
  _getInitialState() {
    return {
      roots: {},
      watches: {}
    };
  }
  _willReceiveProps({config, key, arc}, {roots, watches}, oldProps) {
    if (config.useStorage) {
      // use runtime storage instead of this code
      return;
    }
    if (oldProps.key && key !== oldProps.key) {
      this._disposeWatches(watches);
    }
    if (key && arc && !Const.SHELLKEYS[key]) {
      this._scanHandles(key, arc, roots);
    }
  }
  _scanHandles(key, arc, roots) {
    const paths = {};
    [...arc.storeTags].forEach(tagEntry => this._handleToPaths(paths, key, tagEntry));
    this._updateWatches(arc, roots, paths);
  }
  _handleToPaths(paths, key, [localHandle, tags]) {
    const {type} = localHandle;
    if (type.isCollection || type.isEntity) {
      // TODO(sjmiles): the contextId has to be unique for this arc, but also persistent
      // across subsequent (step-driven) Arc reloads. I haven't found a way to produce
      // such an id without relying on tags
      if (tags && tags.size > 0 && !tags.has('nosync')) {
        const contextId = this._computeContextHandleId(type, tags);
        const path = `arcs/${key}/${Const.DBLABELS.handles}/${contextId}`;
        paths[path] = localHandle;
        log('choosing to watch ', path, localHandle.id);
      }
     }
   }
  _computeContextHandleId(type, tags, prefix) {
    return ''
      + (prefix ? `${prefix}-` : '')
      + (`${type.toPrettyString()}-`.replace(/ /g, '_'))
      + ((tags && [...tags].length) ? `${[...tags].sort().join('-').replace(/#/g, '')}` : '')
      ;
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
    const handler = this._remoteVariableChange(arc, path, handle);
    this._addWatch(`${path}/data`, 'value', handler);
  }
  _remoteVariableChange(arc, path, handle) {
    // Ensure we get at least one response from Firebase before
    // we start writing back.
    let initialized = false;
    // actual handler is here
    return async snap => {
      log(`remote handle change [${path}]`);
      const remoteValue = snap.val();
      if (!initialized) {
        initialized = true;
        handle.on('change', change => this._localVariableChange(handle, path, change, remoteValue), arc);
        // if the first callback has no data...
        if (remoteValue === null) {
          // ... avoiding setting `null` locally if there is no metadata
          const metaSnap = await snap.ref.parent.child('metadata').once('value');
          if (!metaSnap.exists()) {
            return;
          }
        }
      }
      handle.set(remoteValue, originatorId);
    };
  }
  _localVariableChange(handle, path, change, remoteValue) {
    if (change.originatorId == originatorId) {
      return;
    }
    log(`local handle change [${path}]`, change.data);
    Firebase.db.child(`${path}/metadata`).set({
      type: ArcsUtils.metaTypeFromType(handle.type)
    });
    const node = Firebase.db.child(`${path}/data`);
    node.set(change.data ? this._removeUndefined(change.data) : null);
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
    log('trigger: remote add', handle.id, entity);
    const keys = [arc.generateID('key')];
    // doesn't trigger an `add` event if `entity` is already in `handle`
    handle.store(entity, originatorId, keys);
    log('remote add result', await handle.toList());
  }
  async _remoteSetChildRemoved(snap, arc, path, handle) {
    const entity = snap.val();
    log('trigger: remote remove', handle.id, entity);
    // Use any existing keys.
    const keys = [];
    // doesn't trigger a `remove` event if `entity` is not part of `handle`
    handle.remove(entity.id, originatorId, keys);
    log('remote remove result', await handle.toList());
  }
  _localSetChange(handle, path, change, remoteValue) {
    if (change.originatorId == originatorId) {
      return;
    }
    log('localSetChange', change);
    // TODO(sjmiles): we cannot have '.' or '/' in FB key names, and some of these ids contain
    // relative filepaths.
    // This is an asymmetric (lossy) solution that simply removes/alters those characters.
    // Maybe we could encode these strings and decode them on other side (e.g. `btoa/atob`), but it's problematic
    // for existing unencoded data (as opposed to this solution which only affects keys that have bad characters).
    const cleanKey = key => key.replace(/[./]/g, '');
    if (change.add) {
      change.add.forEach(({effective, value: record}) => {
        if (!effective) return;
        log('trigger: local add', record);
        Firebase.db.child(`${path}/data/${cleanKey(record.id)}`).set(this._removeUndefined(record));
      });
    } else if (change.remove) {
      change.remove.forEach(({effective, value: record}) => {
        if (!effective) return;
        log('trigger: local remove', record);
        Firebase.db.child(`${path}/data/${cleanKey(record.id)}`).remove();
      });
    } else {
      warn('Unsupported "handle.change" event', change);
    }
  }
  // low-level
  _removeUndefined(object) {
    return JSON.parse(JSON.stringify(object));
  }
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
