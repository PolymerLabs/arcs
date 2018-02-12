/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import ArcsUtils from "../lib/arcs-utils.js";
import Xen from '../../components/xen/xen.js';

const db = window.db;

class PersistentHandles extends Xen.Base {
  static get observedAttributes() { return ['arc','key','handles']; }
  _getInitialState() {
    return {
      watchers: []
    };
  }
  _update(props, state) {
    if (props.key && props.arc && !props.handles) {
      state.db = db.child(`arcs/${props.key}`);
      this._watchHandles(props.arc, state);
      this._fire('handles', true);
    }
  }
  _watchHandles(arc, state) {
    PersistentHandles.log('Syncing handles');
    state.watchers.forEach(w => w && w());
    state.watching = new Set();
    state.watchers = [...arc._handleTags].map(tagEntry => this._watchHandle(arc, state, tagEntry));
  }
  _watchHandle(arc, state, [localHandle, tags]) {
    if (!tags || tags.size == 0 || tags.has('#nosync')) {
      return;
    }
    let handleId = ArcsUtils.getContextHandleId(localHandle.type, tags);
    if (state.watching.has(handleId)) {
      return;
    }
    state.watching.add(handleId);
    // TODO(wkorman): Rename `views` to `handles` below on the next database rebuild.
    let remoteHandleMeta = state.db.child(`views/${handleId}`);
    // TODO(sjmiles): maybe not do this unless we have to (reducing FB thrash)
    remoteHandleMeta.child('metadata').update({
      type: ArcsUtils.metaTypeFromType(localHandle.type),
      name: localHandle.name || null,
      tags: [...tags]
    });
    let remoteHandle = remoteHandleMeta.child('values');
    if (localHandle.type.isSetView) {
      PersistentHandles.log(`Syncing set ${handleId}`);
      return this._syncSet(arc, localHandle, remoteHandle);
    }
    if (localHandle.type.isEntity) {
      //PersistentHandles.log(`[disabled] Syncing variable ${handleId}`);
      PersistentHandles.log(`Syncing variable ${handleId}`);
      return this._syncVariable(arc, localHandle, remoteHandle);
    }
  }
  // Synchronize a local variable with a remote variable.
  _syncVariable(arc, localVariable, remoteVariable) {
    var initialLoad = true;
    const callback = remoteVariable.on('value', snapshot => {
      const localValue = localVariable._stored;
      const remoteValue = snapshot.val();
      if (localValue && !remoteValue) {
        localVariable.clear();
      } else if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        localVariable.set(remoteValue);
      }
      if (initialLoad) {
        // Once the first load is complete sync starts listening to
        // local changes and applying those to the remote variable.
        initialLoad = false;
        localVariable.on('change', change => {
          if (change.data && change.data.id.startsWith(arc.id)) {
            remoteVariable.set(ArcsUtils.removeUndefined(change.data));
          } else if (change.data === undefined) {
            remoteVariable.remove();
          }
        }, arc);
      }
    });
    return () => remoteVariable.off('value', callback);
  }
  _syncSet(arc, localSet, remoteSet) {
    let off = [];
    let cb = remoteSet.on('child_added', data => {
      if (!data.val().id.startsWith(arc.id)) {
        localSet.store(data.val());
      }
    });
    off.push(() => remoteSet.off('child_added', cb));
    cb = remoteSet.on('child_removed', data => {
      // Note: element will only be removed and 'remove' event will only be
      // fired iff the ID is present in the set.
      localSet.remove(data.val().id);
    });
    off.push(() => remoteSet.off('child_removed', cb));
    // Since child_added events for the initial, pre-loaded data above will
    // fire *before* the value event fires on the parent, we use the value
    // event to detect when initial loading is done. That is when we start
    // listening to local set changes.
    remoteSet.once('value', () => {
      // At this point we're guaranteed the initial remote load is done.
      localSet.on('change', change => {
        if (change.add) {
          change.add.forEach(a => {
            // Only store changes that were made locally.
            if (a.id.startsWith(arc.id)) {
              remoteSet.push(ArcsUtils.removeUndefined(a));
            }
          });
        } else if (change.remove) {
          change.remove.forEach(r => {
            remoteSet.orderByChild('id').equalTo(r.id).once('value', snapshot => {
              snapshot.forEach(data => {
                remoteSet.child(data.key).remove();
              });
            });
          });
        } else {
          PersistentHandles.log('Unsupported change', change);
        }
      }, arc);
    });
    return () => off.forEach(w => w && w());
  }
}
PersistentHandles.log = Xen.Base.logFactory('PersistentHandles', '#aa00c7');
customElements.define('persistent-handles', PersistentHandles);
