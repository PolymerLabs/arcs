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
import Arcs from '../../lib/arcs.js';
import ArcsUtils from '../../lib/arcs-utils.js';
import Const from '../../constants.js';
import {FbUserContext} from './FbUserContext.js';

const log = Xen.logFactory('fb-user-context', '#bb22ee');

class FbUserContextElement extends Xen.Debug(Xen.Base, log) {
   static get observedAttributes() {
    return ['config', 'userid', 'context'];
  }
  _getInitialState() {
    return {
      fbuser: new FbUserContext((type, detail) => this._onFieldEvent(type, detail))
    };
  }
  async _update(props, state) {
    const {context, userid} = props;
    if (context && context !== state.context) {
      state.context = context;
      state.userid = null;
      state.friendsStore = null;
    }
    if (userid !== state.userid) {
      state.userid = null;
      if (state.friendsStore) {
        ArcsUtils.clearStore(state.friendsStore);
      }
    }
    if (context && !state.friendsStore && !state.creatingFriendsStore) {
      state.creatingFriendsStore = true;
      state.friendsStore = await this._createFriendsStore(context);
      state.creatingFriendsStore = false;
    }
    if (context && userid && state.friendsStore && userid !== state.userid) {
      state.shellFriends = {};
      state.userid = userid;
      this._queryUser(props, state);
    }
  }
  async _createFriendsStore(context) {
    const schema = {tag: 'Entity', data: {names: ['User'], fields: {id: 'Text', name: 'Text', avatar: 'URL'}}};
    const type = Arcs.Type.fromLiteral(schema).collectionOf();
    const name = 'Friends';
    const id = 'friends';
    const tags = ['friends'];
    return context.createStore(type, name, id, tags);
  }
  _queryUser({userid}, state) {
    //log('querying user context');
    state.boxed = Object.create(null);
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
      case 'share-changed':
        this._shareChanged(field);
        break;
      case 'avatar-changed':
        this._avatarChanged(field);
        break;
    }
  }
  _avatarChanged(field) {
    const user = field.parent.parent.parent;
    const userid = user.path.split('/')[2];
    const avatar = field.data.data;
    if (avatar && userid !== this._props.userid) {
      //log(userid, avatar.rawData.url);
      this._updateShellFriend(userid, {avatar: avatar.rawData.url});
    }
  }
  async _friendChanged(field) {
    // `friendStore` is for particles
    const {friendsStore} = this._state;
    const id = field.path.split('/')[2];
    friendsStore.remove(id);
    const entity = this._friendFieldToEntity(id, field);
    // FIXME: store.generateID may not be safe (session scoped)?
    friendsStore.store(entity, [friendsStore.generateID()]);
    // `shellFriends` is for shell
    this._updateShellFriend(id, {id, name: entity.rawData.name});
  }
  async _updateShellFriend(id, data) {
    const {shellFriends} = this._state;
    shellFriends[id] = Object.assign({
      avatar: `https://$shell/assets/avatars/user (0).png`},
      shellFriends[id] || Object,
      data
    );
    this._state._notify = Xen.debounce(this._state._notify, () => {
      this._fire('friends', Xen.clone(shellFriends));
    }, 1000);
  }
  _friendFieldToEntity(id, field) {
    const {info} = field.value;
    const {name, avatar} = info || Object;
    return {
      id,
      rawData: {
        id,
        name: name || '(n/a)',
        avatar: avatar
      }
    };
  }
  async _shareChanged(field) {
    // `field` represents an `arc` node in the db
    // we observe the arc node so we can depend on `arc.metadata.share`
    // but we also are processing `arc.shim_handles`
    // this is slightly lower-granularity than what is possible
    const shim_stores = field.fields.shim_handles;
    if (shim_stores) {
      Object.values(shim_stores.fields).forEach(field => this._shareFieldChanged(field));
    }
  }
  async _shareFieldChanged(field) {
    const {context, userid} = this._props;
    const arc = field.parent.parent;
    const arcid = arc.path.split('/')[2];
    const user = arc.parent.parent.parent;
    const ownerid = user.path.split('/')[2];
    const isProfile = ownerid === userid;
    const sharing = arc.data.metadata.share;
    const shareable = !field.disposed && field.data.data && (sharing > 2 || (isProfile && sharing > 1));
    this._updateBoxedShare(context, ownerid, arcid, field.key, field.data, shareable);
    const ownername = isProfile ? 'my' : (user.data.info && user.data.info.name || `(n/a)`);
    const storename = `${Const.STORES[isProfile ? 'my' : 'shared']}_${field.key}`;
    const storeid = `${field.key}|from|${ownerid}|${arcid}`;
    this._updateSimpleShare(context, ownerid, ownername, storename, storeid, shareable, field);
  }
  async _updateSimpleShare(context, ownerid, ownername, storename, storeid, shareable, field) {
    // discard old data
    await this._removeShare(context, storeid);
    // if the field is to be shared
    if (shareable) {
      // then install the data into a store
      const store = await this._addShare(context, storename, storeid, ownerid, field.key, field.data);
      if (store) {
        // compute description
        const typeName = store.type.toPrettyString().toLowerCase();
        store.description = this._getStoreDescription(typeName, store.tags, 'my', ownername);
      }
    }
  }
  _getStoreDescription(name, tags, user, owner) {
    let proper = (user === owner) ? 'my' : `${owner}'s`;
    if (tags && tags.length) {
      return `${proper} ${tags[0]}`;
    }
    if (name) {
      return `${proper} ${name}`;
    }
  }
  async _removeShare(context, id) {
    const store = await context.findStoreById(id);
    if (store) {
      ArcsUtils.clearStore(store);
    }
  }
  async _addShare(context, name, storeid, ownerid, tag, {metadata, data}) {
    let store = await context.findStoreById(storeid);
    if (!store) {
      const type = ArcsUtils.typeFromMetaType(metadata.type);
      store = await context.createStore(type, name, storeid, [tag]);
    }
    this.storeEntitiesWithUid(store, data, ownerid);
    return store;
  }
  async _updateBoxedShare(context, ownerid, arcid, key, {metadata, data}, shareable) {
    const storeid = `${Const.STORES.boxed}_${key}`;
    const dataid = `${ownerid}|${arcid}`;
    const boxid = `${key}|${dataid}`;
    // if store exists, remove old items
    let store = await context.findStoreById(storeid);
    if (store) {
      // (read) id cache for items added to the box from this share
      const boxed = this._state.boxed[boxid];
      if (boxed) {
        boxed.forEach(id => store.remove(id));
      }
    }
    // if there are new shared items
    if (data && shareable) {
      // create a new store as needed
      if (!store) {
        const type = ArcsUtils.typeFromMetaType(metadata.type);
        const collectionType = type.isCollection ? type : type.collectionOf();
        store = await context.createStore(collectionType, storeid, storeid, [storeid]);
      }
      // add items with additional UID
      const storedIds = this.storeEntitiesWithUid(store, data, dataid);
      // (write) id cache for items added to the box from this share
      const boxed = this._state.boxed;
      boxed[boxid] = (boxed[boxid] || []).concat(storedIds);
    }
  }
  storeEntitiesWithUid(store, data, uid) {
    const ids = [];
    const storeDecoratedEntity = ({id, rawData}, uid) => {
      const decoratedId = `${id}:uid:${uid}`;
      ids.push(decoratedId);
      if (store.type.isCollection) {
        // FIXME: store.generateID may not be safe (session scoped)?
        store.store({id: decoratedId, rawData}, [store.generateID()]);
      } else {
        store.set({id: decoratedId, rawData});
      }
    };
    if (data.id) {
      storeDecoratedEntity(data, uid);
    } else {
      Object.values(data).forEach(entity => storeDecoratedEntity(entity, uid));
    }
    return ids;
  }
}
customElements.define('fb-user-context', FbUserContextElement);
