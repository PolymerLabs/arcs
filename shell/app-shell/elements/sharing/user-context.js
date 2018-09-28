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
      friendEntityIds: {},
      // snapshot of BOXED_avatar for use by shell
      avatars: {},
    };
  }
  _update(props, state) {
    const {context, userid, coords, users} = props;
    const {user, userStore, usersStore} = state;
    if (context && !state.initStores) {
      state.initStores = true;
      this._requireStores(context);
    }
    if (users && usersStore && state.users !== users) {
      state.users = users;
      // TODO(sjmiles): clear usersStore first, or modify _updateSystemStores to avoid
      // duplication ... as of now this never happens since `users` is only generated
      // once.
      this._updateSystemUsers(users, usersStore);
    }
    if (user && userStore && userid !== state.userid) {
      state.userid = userid;
      this._updateSystemUser(props, state);
    }
    if (user && userStore && coords && coords !== user.rawData.location) {
      user.rawData.location = coords;
      log('updating user coords:', user);
      userStore.set(user);
    }
  }
  async _requireStores(context) {
    await Promise.all([
      this._requireProfileFriends(context),
      this._requireProfileUserName(context),
      this._requireProfileAvatar(context),
      this._requireBoxedAvatar(context),
      this._requireSystemUsers(context),
      this._requireSystemUser(context),
      this._requireProfilePipedTvShow(context),
      this._requireProfileAllPipedAllTvShows(context),
      this._requireBoxedShowsTiles(context)
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
  async _requireProfileUserName(context) {
    const options = {
      schema: schemas.UserName,
      name: 'PROFILE_userName',
      id: 'PROFILE_userName',
      tags: ['userName'],
      isCollection: true
    };
    const store = await this._requireStore(context, 'profileUserName', options);
    return store;
  }
  async _requireProfileAvatar(context) {
    const options = {
      schema: schemas.Avatar,
      name: 'PROFILE_avatar',
      id: 'PROFILE_avatar',
      tags: ['PROFILE_avatar'],
      isCollection: true
    };
    const store = await this._requireStore(context, 'profileAvatar', options);
    return store;
  }
  async _requireBoxedAvatar(context) {
    const options = {
      schema: schemas.Avatar,
      name: 'BOXED_avatar',
      id: 'BOXED_avatar',
      tags: ['BOXED_avatar'],
      isCollection: true
    };
    const store = await this._requireStore(context, 'boxedAvatar', options);
    store.on('change', () => this._boxedAvatarChanged(store), this);
    return store;
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
  async _requireBoxedShowsTiles(context) {
    const options = {
      schema: schemas.TVMazeShow,
      name: 'BOXED_shows-tiles',
      id: 'BOXED_shows-tiles',
      tags: ['BOXED_shows-tiles'],
      isCollection: true
    };
    await this._requireStore(context, '', options);
  }
  async _requireProfilePipedTvShow(context) {
    const options = {
      schema: schemas.TVMazeShow,
      name: 'PROFILE_piped-tv_show',
      id: 'PROFILE_piped-tv_show',
      tags: ['piped', 'tv_show'],
      isCollection: true
    };
    await this._requireStore(context, '', options);
  }
  async _requireProfileAllPipedAllTvShows(context) {
    const options = {
      schema: schemas.TVMazeShow,
      name: 'PROFILE_all_piped-all_tv_shows',
      id: 'PROFILE_all_piped-all_tv_shows',
      tags: ['all_piped', 'all_tv_shows'],
      isCollection: true
    };
    await this._requireStore(context, '', options);
  }
  async _requireStore(context, eventName, options, onchange) {
    const store = await Stores.createContextStore(context, options);
    if (onchange) {
      store.on('change', onchange, this);
    }
    if (eventName) {
      this._fire(eventName, store);
    }
    return store;
  }
  _updateSystemUsers(users, usersStore) {
    log('updateSystemUsers');
    Object.values(users).forEach(user => usersStore.store({
      id: usersStore.generateID(),
      rawData: {
        id: user.id,
        name: user.name
      }
    }, ['users-stores-keys']));
  }
  async _updateSystemUser(props, state) {
    if (!state.disposingUser) {
      const {user, userStore, userContext} = state;
      if (userContext) {
        state.disposingUser = true;
        state.userContext = null;
        try {
          await userContext.dispose();
        } catch (x) {
          //
        }
        state.disposingUser = false;
      }
      const {context, coords, userid} = props;
      if (userid) {
        state.userContext = new SingleUserContext(context, userid, true);
      }
      user.rawData.id = userid;
      user.rawData.location = coords;
      log('updating user', user);
      userStore.set(user);
    }
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
  async _boxedAvatarChanged(store) {
    const avatars = await store.toList();
    this._fire('avatars', avatars);
    avatars.get = id => {
      const avatar = avatars.find(avatar => {
        const uid = avatar.id.split(':uid:').pop();
        return uid === id;
      });
      return avatar && avatar.rawData;
    };
  }
});
