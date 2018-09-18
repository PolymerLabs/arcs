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
    return ['context', 'userid'];
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
  _update({context, userid}, state, oldState) {
    if (context && !state.initStores) {
      state.initStores = true;
      this._requireStores(context);
    }
    if (context && userid !== state.userid) {
      if (state.userContext) {
        state.userContext.dispose();
        state.userContext = null;
      }
      state.userid = userid;
      if (userid) {
        state.userContext = new SingleUserContext(context, userid, true);
      }
    }
  }
  async _requireStores(context) {
    await Promise.all([
      this._requireProfileFriends(context),
      this._requireBoxedAvatar(context)
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
      schema: schemas.Person,
      name: 'BOXED_avatar',
      id: 'BOXED_avatar',
      tags: ['BOXED_avatar'],
      isCollection: true
    };
    return await this._requireStore(context, 'boxedAvatar', options);
  }
  async _requireStore(context, name, options, onchange) {
    const store = await Stores.createContextStore(context, options);
    if (onchange) {
      store.on('change', onchange, this);
    }
    this._fire(name, store);
    return store;
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
