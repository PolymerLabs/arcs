/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../../components/xen/xen.js';
import ArcsUtils from '../../lib/arcs-utils.js';
import Const from '../../constants.js';
import {FbUserContext} from './FbUserContext.js';
import {FbStore} from './FbStore.js';

const log = Xen.logFactory('fb-user-context', '#bb22ee');

class FbUserContextElement extends Xen.Base {
   static get observedAttributes() {
    return ['config', 'userid', 'context'];
  }
  _getInitialState() {
    return {
      fbuser: new FbUserContext((type, detail) => this._onFieldEvent(type, detail)),
      pendingFriends: []
    };
  }
  _update(props, state) {
    if (props.context !== state.context) {
      state.context = props.context;
      state.friendstore = null;
      state.friendstoreinit = false;
      state.userid = null;
    }
    if (props.context && props.userid !== state.userid) {
      state.userid = props.userid;
      this._queryUser(props, state);
    }
    if (props.context) {
      if (!state.friendstoreinit) {
        state.friendstoreinit = true;
        this._initFriendStore(props, state);
      }
    }
  }
  get value() {
    return this._state.field.value;
  }
  _queryUser({userid}, state) {
    log('querying user context');
    state.shares = Object.create(null);
    if (state.field) {
      state.field.dispose();
    }
    state.field = state.fbuser.queryUser(userid);
    state.field.activate();
  }
  _onFieldEvent(type, field) {
    switch (type) {
      case 'friend-changed':
        this._friendChanged(field);
        break;
      case 'profile-changed':
        this._profileChanged(field);
        break;
      case 'share-changed':
        this._shareChanged(field);
        break;
    }
  }
  // below here is all `friend` stuff, factor out; abstraction?
  async _initFriendStore({context}, state) {
    const options = {
      schema: {tag: 'Entity', data: {names: ['User'], fields: {id: 'Text', name: 'Text', avatar: 'URL'}}},
      type: '[User]',
      name: 'Friends',
      id: 'friends',
      tags: ['friends']
    };
    state.friendstore = await FbStore.createContextStore(context, options);
    state.pendingFriends.forEach(field => this._friendChanged(field));
    state.pendingFriends = [];
  }
  _friendChanged(field) {
    const key = field.path.split('/')[2];
    const {friendstore, pendingFriends} = this._state;
    if (!friendstore) {
      pendingFriends.push(field);
    }
    else {
      friendstore.remove(key);
      if (!field.disposed) {
        friendstore.store(this._friendFieldToEntity(key, field));
      }
    }
  }
  _friendFieldToEntity(key, field) {
    const value = field.value;
    const info = value.info || Object;
    return {
      id: key,
      rawData: {
        id: key,
        name: info.name || '(n/a)',
        avatar: info.avatar
      }
    };
  }
  // below here is all `profile` stuff, factor out; abstraction?
  async _profileChanged(field) {
    // filter out bogus `nosync` stores that shouldn't be in FB anyway
    if (field.key.includes(`nosync`)) {
      return;
    }
    log('updating profile', field.key);
    const data = field.data.data;
    if (data) {
      const {context} = this._props;
      const id = `${Const.HANDLES.profile}_${field.key}`;
      const store = await this._requireStore(context, id, id /*field.key*/, field.value);
      if (store._boxType.isCollection) {
        Object.values(data).forEach(datum => store.remove(datum.id));
      } else {
        store.remove(data.id);
      }
      if (!field.disposed) {
        if (store._boxType.isCollection) {
          Object.values(data).forEach(datum => store.store(datum));
        } else {
          store.store(data);
        }
      }
    }
  }
  async _requireStore(context, id, tag, {metadata}) {
    // construct type object
    const type = ArcsUtils.typeFromMetaType(metadata.type);
    const collectionType = type.isCollection ? type : type.collectionOf();
    // find or create a store
    const store = await FbStore._requireHandle(context, collectionType, id /*metadata.name*/, id, [tag]);
    // compute description
    const typeName = store.type.toPrettyString().toLowerCase();
    store.description = ArcsUtils._getHandleDescription(typeName, store.tags, 'user', 'user');
    store._boxType = type;
    return store;
  }
  // below here is all `share` stuff, factor out; abstraction?
  async _shareChanged(field) {
    const {context} = this._props;
    const friendid = field.parent.path.split('/')[2];
    const arcid = field.parent.key;
    // TODO(sjmiles): tricky bit: `field.value` expands joins, while `field.data` does not
    // in this exact scenario, `data` has the information we need and allows us to use fields from
    // two diferent schemas (one with a join, one without)
    // this might not be an issue if join data didn't clobber the join key
    const value = field.data;
    const shared = value.metadata && value.metadata.share;
    const shareid = `${friendid}|${arcid}`;
    const oldShare = this._state.shares[shareid];
    if (oldShare) {
      await this._removeShare(context, oldShare);
    }
    const share = {
      shareid: `${friendid}|${arcid}`,
      // TODO(sjmiles): don't need to cache anything but the keys
      stores: value.shim_handles
    };
    if (!field.disposed && share.stores && shared > 2) {
      this._state.shares[shareid] = share;
      this._addShare(context, share);
    }
  }
  async _addShare(context, {shareid, stores}) {
    await Promise.all(Object.keys(stores).map(async key => {
      const {metadata, data} = stores[key];
      if (metadata && data) {
        log(`[${key}] share ${shareid}`);
        const storeid = `${Const.HANDLES.boxed}_${key}`;
        const store = await this._requireStore(context, storeid, storeid, {metadata});
        const addToBox = datum => store.store({
          id: `${shareid}|${datum.id}`,
          rawData: datum.rawData
        });
        if (store._boxType.isCollection) {
          Object.keys(data).forEach(id => addToBox(data[id]));
        } else {
          addToBox(data);
        }
      }
    }));
  }
  async _removeShare(context, {shareid, stores}) {
    await Promise.all(Object.keys(stores).map(async key => {
      const {metadata, data} = stores[key];
      if (metadata && data) {
        const storeid = `${Const.HANDLES.boxed}_${key}`;
        const store = context.findStoreById(storeid);
        if (store) {
          log(`removing [${key}] share ${shareid}`);
          // TODO(sjmiles): if we are replacing, `datum` we have is likely to have a different
          // version number than the one in the store.
          // Find a record that differs only by version number.
          // Often this record will not exist, and this is a huge waste of time.
          // Maybe we can build a separate index.
          const removeFromBox = datum => {
            const noversionId = `${shareid}|${datum.id.split(':').slice(0, -1).join(':')}`;
            const key = [...store._items.keys()].find(id => id.split(':').slice(0, -1).join(':') === noversionId);
            if (key) {
              store.remove(key);
            }
          };
          if (store._boxType.isCollection) {
            Object.values(data).forEach(datum => removeFromBox(datum));
          } else {
            removeFromBox(data);
          }
        }
      }
    }));
  }
}
customElements.define('fb-user-context', FbUserContextElement);
