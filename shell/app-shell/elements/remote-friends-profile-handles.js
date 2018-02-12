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
import ArcsUtils from "../lib/arcs-utils.js";
import Xen from '../../components/xen/xen.js';

class RemoteFriendsProfileHandles extends Xen.Base {
  static get observedAttributes() { return ['arc','friends','user']; }
  _getInitialState() {
    return {
      group: new WatchGroup(),
      db: db
    }
  }
  _update(props, state, lastProps) {
    if (props.arc && props.user && props.friends && props.friends !== lastProps.friends) {
      state.group.watches = this._watchFriends(state.db, state.group, props.arc, props.friends, props.user);
    }
  }
  _watchFriends(db, group, arc, friends, user) {
    friends = friends.map(friend => friend.rawData);
    // include `user` in friends, so we can access generic profile info this way
    // TODO(sjmiles): is this the right decision? this data is already available in another handle
    friends.push({id: user.id});
    RemoteFriendsProfileHandles.log('got raw FRIENDS', friends);
    return friends.map(friend => {
      return {
        // TODO(sjmiles): watch the entire friend record because today we need
        // both `profiles` and `arcs` to work out the active profile set
        // (because of a lack of referential integrity in the DB)
        // Either enforce integrity here or put these lists into a
        // node where they can be watched discretely (as opposed to watching the
        // entire user node). Over-watching should be harmless, but thrashing
        // slows things down, makes it harder to debug, etc.
        node: db.child(`users/${friend.id}`),
        handler: snap => {
          group.add(this._watchFriendProfileHandles(db, arc, friend, snap));
        }
      }
    });
  }
  _watchFriendProfileHandles(db, arc, friend, snap) {
    // get user record
    let user = snap.val();
    //RemoteFriendsProfileHandles.log(`READING friend's user [${user.name}]`); // from`, String(snap.ref));
    // find keys for user's profile arcs
    return ArcsUtils.getUserProfileKeys(user).map(key => {
      //RemoteFriendsProfileHandles.log(`watching friend's [${user.name}] profile handles`); // from`, String(snap.ref));
      return {
        node: db.child(`arcs/${key}/views`),
        handler: snap => {
          let handles = snap.val();
          if (handles) {
            RemoteFriendsProfileHandles.log(`READING friend's [${user.name}] profile handles`); // from`, String(snap.ref));
            this._processFriendProfileHandles(arc, friend, handles);
          } else {
            RemoteFriendsProfileHandles.log(`friend [${user.name}] has EMPTY profile`); // from`, String(snap.ref));
          }
        }
      }
    });
  }
  _processFriendProfileHandles(arc, friend, handles) {
    //RemoteFriendsProfileHandles.log(`friend's profile handles`, friend, handles);
    Object.keys(handles).forEach(async key => {
      let {values, metadata: {name, type, tags}} = handles[key];
      let tagString = (tags && tags.length ? `${tags.sort().join('_').replace(/#/g, '')}` : '');
      let id = `FRIENDS_PROFILE_${tagString}`;
      // TODO(sjmiles): not always a SetView is it?
      let arcsType = ArcsUtils.typeFromMetaType(type);
      if (values) {
        let handle = await this._requireHandle(arc, id, arcsType, id, [`#friends_${tagString}`]);
        // TODO(sjmiles): how to know if `values` represents a SetView or Entity?
        if ('id' in values) {
          values = [values];
        } else {
          values = Object.values(values);
        }
        let data = values.map(v => {
          // TODO(sjmiles): `owner` not generally in schema, should be Entity metadata?
          v.rawData.owner = friend.id;
          return {
            id: v.id, //arc.generateID(),
            rawData: v.rawData
          };
        });
        ArcsUtils.addHandleData(handle, data);
        RemoteFriendsProfileHandles.log(`merged friend's profile handle [${id}]`); //, id, handle, data);
      }
    });
  }
  async _requireHandle(arc, id, type, name, tags) {
    return arc.context.findHandleById(id) || await arc.context.newView(type, name, id, tags);
  }
}
RemoteFriendsProfileHandles.log = Xen.Base.logFactory('RemoteFriendsPHs', '#805acb');
customElements.define('remote-friends-profiles-handles', RemoteFriendsProfileHandles);
