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
import {Xen} from '../../lib/components/xen.js';
import {SyntheticStores} from '../../lib/runtime/synthetic-stores.js';
import {SingleUserContext} from '../../lib/single-user-context.js';

const log = Xen.logFactory('UserContext', '#4f0433');
const warn = Xen.logFactory('UserContext', '#4f0433', 'warn');

customElements.define('user-context', class extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['storage', 'context', 'userid', 'users'];
  }
  _getInitialState() {
    SyntheticStores.init();
    return {
      // ms to wait until we think there is probably some context
      contextWait: 3000,
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
    if (props.context && state.context !== props.context) {
      state.context = props.context;
      this.updateFriends(props, state);
    }
    if (props.storage && props.context && props.userid !== state.userid) {
      state.userid = props.userid;
      this.awaitState('arcsStore', () => this.updateArcsStore(props, state));
    }
  }
  async updateArcsStore(props, state) {
    const {storage, userid} = props;
    const arcsStore = await this.fetchArcsStore(storage, userid);
    if (arcsStore) {
      // TODO(sjmiles): plop arcsStore into state early for updateUserContext, usage is weird
      state.arcsStore = arcsStore;
      // TODO(sjmiles): props and state are suspect after await
      await this.updateUserContext(props, state);
    } else {
      // retry after a bit
      setTimeout(() => this.state = {userid: null}, state.contextWait);
    }
    // signal when user-decorated context is `ready`
    // TODO(sjmiles): ideally we have a better signal than a timeout
    setTimeout(() => this.fire('context', props.context), state.contextWait);
    return arcsStore;
  }
  async fetchArcsStore(storage, userid) {
    const store = await SyntheticStores.getArcsStore(storage, `${userid}${Const.launcherSuffix}`);
    if (store) {
      log(`marshalled arcsStore for [${userid}]`); //[${storage}]`, store);
      return store;
    }
    warn(`failed to marshal arcsStore for [${userid}][${storage}]`);
  }
  async updateUserContext({storage, userid, context}, {userContext, arcsStore}) {
    await this.disposeUserContext(userContext);
    // do not operate on stale userid
    if (!this.state.userContext && userid === this.state.userid) {
      const isProfile = true;
      this.state = {
        userContext: new SingleUserContext(storage, context, userid, arcsStore, isProfile)
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
    log(`trying to addFriend [${friendId}]`);
    if (!friends[friendId]) {
      friends[friendId] = true;
      const arcsStore = await this.fetchArcsStore(storage, friendId);
      if (arcsStore) {
        friends[friendId] = new SingleUserContext(storage, context, friendId, arcsStore, false);
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
