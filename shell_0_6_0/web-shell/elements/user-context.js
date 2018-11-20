/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../lib/xen.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {SingleUserContext} from '../../lib/single-user-context.js';

const log = Xen.logFactory('UserContext', '#4f0433');

customElements.define('user-context', class extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'storage', 'context', 'userid', 'arcstore', 'coords', 'users'];
  }
  _getInitialState() {
    return {
      // ms to wait until we think there is probably some context
      contextWait: 800,
      // maps userid to SingleUserContext for friends
      friends: {},
      // maps entityid's to userid's for friends to workaround missing data
      // in `remove` records
      friendEntityIds: {},
      // snapshot of BOXED_avatar for use by shell
      avatars: {},
    };
  }
  update(props, state) {
    if (!state.env && props.env) {
      state.env = props.env;
      SyntheticStores.init(props.env);
    }
    // if (props.context && state.systemUserId !== props.userid) {
    //   state.systemUserId = props.userid;
    //   if (props.userid) {
    //     this.updateSystemUser(props);
    //   }
    // }
    if (props.storage && props.context && props.arcstore && props.userid !== state.userid) {
      state.userid = props.userid;
      this.updateSystemUser(props);
      this.updateUserContext(props, state);
      setTimeout(() => this.fire('context', props.context), state.contextWait);
    }
    //const {context, userid, coords, users} = props;
    //const {user, userStore, usersStore} = state;
    // if (users && usersStore && state.users !== users) {
    //   state.users = users;
    //   // TODO(sjmiles): clear usersStore first, or modify _updateSystemStores to avoid
    //   // duplication ... as of now this never happens since `users` is only generated
    //   // once.
    //   this._updateSystemUsers(users, usersStore);
    // }
    // if (user && userStore && userid !== state.userid) {
    //   state.userid = userid;
    //   this._updateSystemUser(props, state);
    // }
    // if (user && userStore && coords && coords !== user.rawData.location) {
    //   user.rawData.location = coords;
    //   log('updating user coords:', user);
    //   userStore.set(user);
    // }
  }
  async updateSystemUser({userid, context}) {
    const store = await context.findStoreById('SYSTEM_user');
    if (store) {
      const user = {
        id: store.generateID(),
        rawData: {
          id: userid,
        }
      };
      store.set(user);
      log('installed SYSTEM_user');
    }
  }
  async updateUserContext({storage, userid, context, arcstore}, {userContext}) {
    if (userContext) {
      this.state = {userContext: null};
      try {
        await userContext.dispose();
      } catch (x) {
        //
      }
    }
    // do not operate on stale userid
    if (!this.state.userContext && userid === this.state.userid) {
      const isProfile = true;
      this.state = {
        userContext: new SingleUserContext(storage, context, userid, arcstore, isProfile)
      };
    }
  }
  // _updateSystemUsers(users, usersStore) {
  //   log('updateSystemUsers');
  //   Object.values(users).forEach(user => usersStore.store({
  //     id: usersStore.generateID(),
  //     rawData: {
  //       id: user.id,
  //       name: user.name
  //     }
  //   }, ['users-stores-keys']));
  // }
  // async _updateSystemUser(props, state) {
  //   if (!state.disposingUser) {
  //     const {user, userStore, userContext} = state;
  //     if (userContext) {
  //       state.disposingUser = true;
  //       state.userContext = null;
  //       try {
  //         await userContext.dispose();
  //       } catch (x) {
  //         //
  //       }
  //       state.disposingUser = false;
  //     }
  //     const {context, coords, userid} = props;
  //     if (userid) {
  //       state.userContext = new SingleUserContext(context, userid, true);
  //     }
  //     user.rawData.id = userid;
  //     user.rawData.location = coords;
  //     log('updating user', user);
  //     userStore.set(user);
  //   }
  // }
  // _onFriendChange(context, info) {
  //   const {friends, friendEntityIds} = this._state;
  //   if (info.add) {
  //     info.add.forEach(add => {
  //       const friendid = add.value.rawData.id;
  //       friendEntityIds[add.value.id] = friendid;
  //       log('onFriendChange', 'adding', friendid);
  //       if (!friends[friendid]) {
  //         friends[friendid] = new SingleUserContext(context, friendid, false);
  //       }
  //     });
  //   }
  //   if (info.remove) {
  //     info.remove.forEach(remove => {
  //       const friendid = friendEntityIds[remove.value.id];
  //       log('onFriendChange', 'removing', friendid);
  //       const friend = friends[friendid];
  //       if (friend) {
  //         friend.dispose();
  //         friends[friendid] = null;
  //       }
  //     });
  //   }
  // }
  // async _boxedAvatarChanged(store) {
  //   const avatars = await store.toList();
  //   this._fire('avatars', avatars);
  //   avatars.get = id => {
  //     const avatar = avatars.find(avatar => {
  //       const uid = avatar.id.split(':uid:').pop();
  //       return uid === id;
  //     });
  //     return avatar && avatar.rawData;
  //   };
  // }
});
