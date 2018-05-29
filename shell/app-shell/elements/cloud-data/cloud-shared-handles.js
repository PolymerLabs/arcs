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

const log = Xen.logFactory('CloudSharedHandles', '#3c008f');

class CloudSharedHandles extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['users', 'arc', 'userid', 'profile'];
  }
  _getInitialState() {
    return {
      watcher: new WatchGroup(),
      watches: {},
      boxes: {}
    };
  }
  _update({userid, profile, arc}, state, oldProps) {
    const arcChanged = Boolean(arc && (arc !== oldProps.arc));
    const userChanged = Boolean(profile && (profile.friends !== state.friends));
    if (userChanged || arcChanged) {
      log('rebuilding boxes and handle watches: arcChanged (', arcChanged, `userChanged:`, userChanged, ')');
      state.boxes = {};
      this._disposeWatches();
      if (profile) {
        state.friends = profile.friends;
        state.watcher.watches = this._watchUsers(arc, state.friends.map(friend => friend.id).concat([userid]));
      }
    }
  }
  _watchUsers(arc, users) {
    return users.map(user => {
      const path = `users/${user}/arcs`;
      log(`watching [${path}]`);
      const watched = {};
      return {
        path,
        handler: snap => this._userArcsChanged(arc, watched, user, snap)
      };
    });
  }
  _userArcsChanged(arc, watched, user, snap) {
    const arcs = snap.val();
    if (arcs) {
      const arcPath = key => `arcs/${key}`;
      // remove watches for keys that are no longer live
      Object.keys(watched).forEach(key => {
        if (!arcs[key]) {
          log(`unwatching ${key}`);
          this._removeWatch(arcPath(key));
          if (watched[key]) {
            Object.keys(watched[key]).forEach(key => this._removeWatch(key));
          }
          // TODO(sjmiles): remove handles also
        }
      });
      // add watches for live keys
      Object.keys(arcs).forEach(key => {
        watched[key] = {};
        const path = arcPath(key);
        log(`watching [${path}] for [${user}]`);
        this._addWatch(path, 'value', snap => this._arcChanged(arc, watched[key], user, key, snap));
      });
    }
  }
  _arcChanged(arc, watched, user, key, snap) {
    log('arc data changed in cloud', key);
    const data = snap.val();
    const {metadata} = data;
    if (metadata) {
      const path = `arcs/${key}/${Const.DBLABELS.handles}`;
      if (metadata && metadata.share > Const.SHARE.private) {
        log(`[${key}] contains shared handles`);
        watched[path] = true;
        this._addWatch(path, 'value', snap => this._handlesChanged(arc, user, key, snap));
      }
    }
  }
  _handlesChanged(arc, user, key, snap) {
    const handles = snap.val();
    if (handles) {
      Object.keys(handles).forEach(async handleKey => {
        const id = `${handleKey}::${key}`; // ArcsUtils.randomId()
        const handle = await this._createOrUpdateHandle(arc, user, id, handleKey, handles[handleKey]);
        //const handle = await this._createOrUpdateHandle(arc, `$shared_${id}`, `#${id}`, handles[id]);
        if (handle) {
          this._fire('shared', {user, handle});
        }
      });
    }
  }
  async _createOrUpdateHandle(arc, user, id, key, handleInfo) {
    const {metadata, data} = handleInfo;
    if (data) {
      let handle;
      // construct type object
      const type = ArcsUtils.typeFromMetaType(metadata.type);
      // TODO(sjmiles): needs refactoring
      const {userid, users} = this._props;
      //if (userid !== user) {
        // find or create a handle in the arc context
        handle = await ArcsUtils._requireHandle(arc, type, metadata.name, id, [`${key}`]);
        log('createOrUpdate handle', handle.id, data);
        await ArcsUtils.setHandleData(handle, data);
        // TODO(sjmiles): how to marshal user information (names)?
        // Append user-id as handle metadata and work out description elsewhere?
        const typeName = handle.type.toPrettyString().toLowerCase();
        handle.description = ArcsUtils._getHandleDescription(typeName, handle.tags,
          users[userid].info.name, users[user].info.name);
          //this._props.userid, user);
      //}
      this._boxHandle(arc, user, type, data, key);
      return handle;
    }
  }
  _boxHandle(arc, user, type, values, tag) {
    const schema = type.isCollection ? type.collectionType.entitySchema : type.entitySchema;
    const hasOwnerField = Boolean(schema.fields.owner);
    // convert firebase format to handle-data format, embed friend id as owner
    const data = this._valuesToData(values, user, hasOwnerField);
    // formulate box id
    const boxId = `${Const.HANDLES.boxed}_${tag}`;
    // acquire type record for a Set of the base type
    const setType = type.isCollection ? type : type.collectionOf();
    log('boxing data into', boxId);
    // combine the data into a box
    this._addToBox(arc, boxId, setType, name, [boxId], data, user);
  }
  // convert firebase format to handle-data format, embed friend id as owner
  _valuesToData(values, friend, hasOwnerField) {
    // TODO(sjmiles):
    if ('id' in values) {
      values = [values];
    } else {
      values = Object.values(values);
    }
    return values.map(v => {
      // TODO(sjmiles): `owner` not generally in schema, should be Entity metadata?
      if (hasOwnerField) {
        v.rawData.owner = friend;
      }
      return {
        id: v.id,
        rawData: v.rawData
      };
    });
  }
  async _addToBox(arc, id, type, name, tags, data, friend) {
    const {boxes} = this._state;
    // find a pre-existing box construct for this id
    let box = boxes[id];
    // if box exists, install the values if we have a handle, otherwise cache them
    if (box) {
      if (box.handle) {
        this._addBoxData(box.handle, data, friend);
        // inform owner that we updated this handle
        this._fire('handle', box.handle);
      } else {
        //log(`caching friend's shared handle for boxing as [${id}]`);
        box.pending.push({data});
      }
    }
    // if box doesn't exist, create it, cache the values, and trigger async handle creation
    else {
      //log(`creating box [${id}] for friend's shared handle `);
      box = boxes[id] = {
        pending: [{data}]
      };
      box.handle = await this._requireHandle(arc, id, type, name, tags);
      box.pending.forEach(m => this._addBoxData(box.handle, m.data, friend));
      // inform owner that we updated this handle
      this._fire('handle', box.handle);
    }
  }
  _addBoxData(handle, data, friend) {
    ArcsUtils.addHandleData(handle, data);
    log(`added [${friend}'s] shared data to handle [${handle.id}]`, data);
  }
  // low-level
  async _requireHandle(arc, id, type, name, tags) {
    return arc.context.findStoreById(id) || await arc.context.newStore(type, name, id, tags);
  }
  _addWatch(path, kind, handler) {
    const {watches} = this._state;
    const id = `${kind}::${path}`;
    const watch = watches[id];
    if (!watch) {
      //log(`watching [${id}]`);
      watches[id] = Firebase.db.child(path).on(kind, handler);
    }
  }
  _removeWatch(path, kind) {
    kind = kind || 'value';
    const {watches} = this._state;
    const id = `${kind}::${path}`;
    const watch = watches[id];
    if (watch) {
      log(`unwatching [${id}]`);
      Firebase.db.child(path).off(kind, watch);
      delete watches[id];
    }
  }
  _disposeWatches() {
    //log('_disposeWatches');
    const {watches} = this._state;
    Object.keys(watches).forEach(id => {
      const [kind, path] = id.split('::');
      Firebase.db.child(path).off(kind, watches[id]);
    });
    this._setState({watches: {}});
  }
}
customElements.define('cloud-shared-handles', CloudSharedHandles);
