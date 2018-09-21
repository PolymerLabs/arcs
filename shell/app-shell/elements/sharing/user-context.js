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
import {Stores} from './stores.js';
import {SingleUserContext} from './single-user-context.js';
import {schemas} from './schemas.js';

const log = Xen.logFactory('UserContext', '#4f0433');

customElements.define('user-context', class extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['context', 'userid', 'coords', 'users'];
  }
  _getInitialState() {
    return {
      // maps userid to SingleUserContext for friends
      friends: {},
      // maps entityid's to userid's for friends to workaround missing data
      // in `remove` records
      friendEntityIds: {}
    };
  }
  _update({context, userid, coords, users}, state) {
    const {user, userStore, usersStore, userContext} = state;
    if (context && !state.initStores) {
      state.initStores = true;
      this._requireStores(context);
    }
    if (users && usersStore) {
      this._updateSystemUsers(users, usersStore);
    }
    if (context && user && userid !== state.userid) {
      state.userid = userid;
      if (userContext) {
        userContext.dispose();
        state.userContext = null;
      }
      if (userid) {
        state.userContext = new SingleUserContext(context, userid, true);
      }
      this._updateSystemUser(user, userid, coords, userStore);
    }
    if (user && coords && coords !== user.rawData.location) {
      log('updating user coords:', user);
      user.rawData.location = coords;
      //userStore.set({user});
    }
  }
  async _requireStores(context) {
    await Promise.all([
      this._requireProfileFriends(context),
      this._requireBoxedAvatar(context),
      this._requireSystemUsers(context),
      this._requireSystemUser(context)
    ]);
    this._fire('stores');
  }
  async _requireProfileFriends(context) {
    const options = {
      schema: schemas.Person,
      name: 'PROFILE_friends',
      id: 'PROFILE_friends',
      tags: ['friends'],
      isCollection: true
    };
    const change = info => this._onFriendChange(context, info);
    return await this._requireStore(context, 'friends', options, change);
  }
  async _requireBoxedAvatar(context) {
    const options = {
      schema: schemas.Avatar,
      name: 'BOXED_avatar',
      id: 'BOXED_avatar',
      tags: ['BOXED_avatar'],
      isCollection: true
    };
    return await this._requireStore(context, 'boxedAvatar', options);
  }
  async _requireSystemUsers(context) {
    const options = {
      schema: schemas.User,
      name: 'SYSTEM_users',
      id: 'SYSTEM_users',
      tags: ['SYSTEM_users'],
      isCollection: true
    };
    const usersStore = await this._requireStore(context, 'systemUsers', options);
    this._setState({usersStore});
  }
  async _requireSystemUser(context) {
    const options = {
      schema: schemas.User,
      name: 'SYSTEM_user',
      id: 'SYSTEM_user',
      tags: ['SYSTEM_user']
    };
    const userStore = await this._requireStore(context, 'systemUser', options);
    const user = {
      id: userStore.generateID(),
      rawData: {
        id: null,
        name: 'User',
        location: 'Object'
      }
    };
    this._setState({userStore, user});
  }
  async _requireStore(context, eventName, options, onchange) {
    const store = await Stores.createContextStore(context, options);
    if (onchange) {
      store.on('change', onchange, this);
    }
    this._fire(eventName, store);
    return store;
  }
  _updateSystemUsers(users, usersStore) {
    Object.values(users).forEach(user => usersStore.store({
      id: usersStore.generateID(),
      rawData: {
        id: user.id,
        name: user.name
      }
    }, ['users-stores-keys']));
  }
  _updateSystemUser(user, userid, coords, userStore) {
    user.rawData.id = userid;
    user.rawData.location = coords;
    log(user);
    userStore.set(user);
  }
  _onFriendChange(context, info) {
    const {friends, friendEntityIds} = this._state;
    if (info.add) {
      info.add.forEach(add => {
        const friendid = add.value.rawData.id;
        friendEntityIds[add.value.id] = friendid;
        log('onFriendChange', 'adding', friendid);
        if (!friends[friendid]) {
          friends[friendid] = new SingleUserContext(context, friendid, false);
        }
      });
    }
    if (info.remove) {
      info.remove.forEach(remove => {
        const friendid = friendEntityIds[remove.value.id];
        log('onFriendChange', 'removing', friendid);
        const friend = friends[friendid];
        if (friend) {
          friend.dispose();
          friends[friendid] = null;
        }
      });
    }
  }
});
