/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Const} from '../../configuration/constants.js';
import {Xen} from '../../lib/xen.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {SingleUserContext} from '../../lib/single-user-context.js';

const log = Xen.logFactory('UserContext', '#4f0433');
const warn = Xen.logFactory('UserContext', '#4f0433', 'warn');

customElements.define('user-context', class extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'storage', 'context', 'userid', 'users'];
  }
  _getInitialState() {
    return {
      // ms to wait until we think there is probably some context
      contextWait: 800,
      // maps userid to SingleUserContext for friends
      friends: {},
      // TODO(sjmiles): workaround for missing data in `remove` records
      // maps entityids to userids for friends
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
    if (props.context && state.context !== props.context) {
      state.context = props.context;
      this.updateFriends(props, state);
    }
    if (props.storage && props.context && props.userid !== state.userid) {
      state.userid = props.userid;
      this.awaitState('arcStore', () => this.updateArcStore(props, state));
    }
  }
  async updateArcStore(props, state) {
    const {storage, userid} = props;
    const arcStore = await this.fetchArcStore(storage, userid);
    if (arcStore) {
      // TODO(sjmiles): plop arcStore into state early for updateUserContext, usage is weird
      state.arcStore = arcStore;
      // TODO(sjmiles): props and state are suspect after await
      await this.updateUserContext(props, state);
    } else {
      // retry after a bit
      setTimeout(() => this.state = {userid: null}, state.contextWait);
    }
    setTimeout(() => this.fire('context', props.context), state.contextWait);
    return arcStore;
  }
  async fetchArcStore(storage, userid) {
    const handleStore = await SyntheticStores.getStore(storage, `${userid}${Const.launcherSuffix}`);
    if (handleStore) {
      const handles = await handleStore.toList();
      const handle = handles[0];
      if (handle) {
        const store = await SyntheticStores.getHandleStore(handle);
        log(`marshalled arcStore for [${userid}][${storage}]`, store);
        return store;
      }
    }
    warn(`failed to marshal arcStore for [${userid}][${storage}]`);
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
  async updateUserContext({storage, userid, context}, {userContext, arcStore}) {
    await this.disposeUserContext(userContext);
    // do not operate on stale userid
    if (!this.state.userContext && userid === this.state.userid) {
      const isProfile = true;
      this.state = {
        userContext: new SingleUserContext(storage, context, userid, arcStore, isProfile)
      };
    }
  }
  async disposeUserContext(userContext) {
    if (userContext) {
      this.state = {userContext: null};
      try {
        await userContext.dispose();
      } catch (x) {
        //
      }
    }
  }
  async updateFriends({storage, userid, context}, state) {
    if (state.friendsStore) {
      log('discarding old PROFILE_friends');
      state.friendsStore.off('change', state.friendsStoreCb);
      state.friendsStore = null;
    }
    const friendsStore = await context.findStoreById('PROFILE_friends');
    if (friendsStore) {
      log('found PROFILE_friends');
      const friendsStoreCb = info => this.onFriendsChange(storage, context, info);
      // get current data
      const friends = await friendsStore.toList();
      // listen for changes
      friendsStore.on('change', friendsStoreCb, this);
      // process friends already in store
      this.onFriendsChange(storage, context, {add: friends.map(f => ({value: f}))});
      this.state = {friendsStore, friendsStoreCb};
    } else {
      warn('PROFILE_friends missing');
    }
  }
  onFriendsChange(storage, context, info) {
    const {friends, friendEntityIds} = this._state;
    if (info.add) {
      info.add.forEach(({value}) => {
        const entityId = value.id;
        const friendId = value.rawData.id;
        // TODO(sjmiles): friendEntityIds is a hack to workaround missing rawData in removal records
        friendEntityIds[entityId] = friendId;
        this.addFriend(storage, context, friends, friendId);
      });
    }
    if (info.remove) {
      info.remove.forEach(remove => this.removeFriend(friends, friendEntityIds[remove.value.id]));
    }
  }
  async addFriend(storage, context, friends, friendId, attempts) {
    log('trying to addFriend', friendId);
    if (!friends[friendId]) {
      friends[friendId] = true;
      const arcStore = await this.fetchArcStore(storage, friendId);
      if (arcStore) {
        friends[friendId] = new SingleUserContext(storage, context, friendId, arcStore, false);
      } else {
        friends[friendId] = null;
        // retry a bit
        attempts = (attempts || 0) + 1;
        if (attempts < 11) {
          const timeout = 1000*Math.pow(2.9076, attempts);
          console.warn(`retry [${attempts}/10] to addFriend [${friendId}] in ${(timeout/1000/60).toFixed(2)}m`);
          setTimeout(() => this.addFriend(storage, context, friends, friendId, attempts), timeout);
        }
      }
    }
  }
  removeFriend(friends, friendId) {
    log('removeFriend', friendId);
    const friend = friends[friendId];
    if (friend) {
      friend.dispose && friend.dispose();
      friends[friendId] = null;
    }
  }
  //async _boxedAvatarChanged(store) {
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
