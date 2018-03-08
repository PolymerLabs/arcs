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
import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';
const db = window.db;

class RemoteFriendsSharedHandles extends Xen.Base {
  static get observedAttributes() { return ['arc', 'friends', 'user']; }
  _getInitialState() {
    return {
      db: db,
      group: new WatchGroup(),
      boxes: {}
    };
  }
  _update(props, state, lastProps) {
    if (props.arc && props.user && props.friends && props.friends !== lastProps.friends) {
      state.group.watches = this._watchFriends(state.db, state.group, props.arc, props.friends, props.user);
    }
  }
  //
  // Level 1: watch all friends arcs listings so we can adapt dynamically
  //
  _watchFriends(db, group, arc, friends, user) {
    friends = friends.map(friend => friend.rawData);
    // include `user` in friends, so we can access generic shared info this way
    // TODO(sjmiles): is this the right decision? this data is already available in another handle
    friends.push({id: user.id});
    RemoteFriendsSharedHandles.log('got raw FRIENDS', friends);
    return friends.map(friend => {
      return {
        // TODO(sjmiles): watch the entire friend record because today we need
        // both `shareds` and `arcs` to work out the active shared set
        // (because of a lack of referential integrity in the DB)
        // Either enforce integrity here or put these lists into a
        // node where they can be watched discretely (as opposed to watching the
        // entire user node). Over-watching should be harmless, but thrashing
        // slows things down, makes it harder to debug, etc.
        node: db.child(`users/${friend.id}`),
        handler: snap => {
          group.add(this._watchFriendSharedHandles(db, arc, friend, snap));
        }
      };
    });
  }
  //
  // Level 2: iterate a friend's share listings and watch the individual handles
  //
  _watchFriendSharedHandles(db, arc, friend, snap) {
    // get friend's user record
    let user = snap.val();
    friend.name = user.name;
    //RemoteFriendsSharedHandles.log(`READING friend's user [${user.name}]`); // from`, String(snap.ref));
    // find keys for user's shared arcs
    return ArcsUtils.getUserShareKeys(user).map(key => {
      RemoteFriendsSharedHandles.log(`watching friend's [${user.name}] shared handles`); // from`, String(snap.ref));
      return {
        node: db.child(`arcs/${key}/views`),
        handler: snap => {
          let handles = snap.val();
          if (handles) {
            RemoteFriendsSharedHandles.log(`READING friend's [${user.name}] shared handles`); // from`, String(snap.ref));
            this._remoteFriendSharedHandlesChanged(arc, friend, handles);
          } else {
            RemoteFriendsSharedHandles.log(`friend [${user.name}] has EMPTY share`); // from`, String(snap.ref));
          }
        }
      };
    });
  }
  //
  // Level 3: process individual handle data
  //
  // TODO(sjmiles): need to delete vestigial handles
  _remoteFriendSharedHandlesChanged(arc, friend, handles) {
    //RemoteFriendsSharedHandles.log(`friend's shared handles`, friend, handles);
    Object.keys(handles).forEach(async key => this._remoteFriendSharedHandleChanged(arc, friend, handles[key]));
  }
  _remoteFriendSharedHandleChanged(arc, friend, handle) {
    // destructure storage node
    let {values, metadata: {name, type, tags}} = handle;
    // build a string by combining tags with `_` and removing `#`
    const tagString = (tags && tags.length ? `${tags.sort().join('_').replace(/#/g, '')}` : '');
    // only box if we have values and tags
    if (values && tagString) {
      // acquire type record
      const arcsType = ArcsUtils.typeFromMetaType(type);
      const schema = arcsType.isSetView ? arcsType.setViewType.entitySchema : arcsType.entitySchema;
      const hasOwnerField = schema.fields.owner;
      // convert firebase format to handle-data format, embed friend id as owner
      const data = this._valuesToData(values, friend, hasOwnerField);
      // formulate id
      const id = `${tagString}-${friend.id}`;
      // create/update a handle for this data
      this._updateHandle(arc, id, arcsType, name, [`#${tagString}`], data, friend);
      // formulate box id
      const boxId = `BOXED_${tagString}`;
      // acquire type record for a Set of the base type
      const setType = arcsType.isSetView ? arcsType : arcsType.setViewOf();
      // combine the data into a box
      this._addToBox(arc, boxId, setType, name, [`#${boxId}`], data);
    }
  }
  // convert firebase format to handle-data format, embed friend id as owner
  _valuesToData(values, friend, provideOwner) {
    if ('id' in values) {
      values = [values];
    } else {
      values = Object.values(values);
    }
    return values.map(v => {
      // TODO(sjmiles): `owner` not generally in schema, should be Entity metadata?
      if (provideOwner) {
        v.rawData.owner = friend.id;
      }
      return {
        id: v.id,
        rawData: v.rawData
      };
    });
  }
  async _updateHandle(arc, id, type, name, tags, data, friend) {
    const handle = await this._requireHandle(arc, id, type, name, tags);
    const typeName = handle.type.toPrettyString().toLowerCase();
    handle.description = ArcsUtils._getHandleDescription(typeName, handle.tags, this._props.user.name, friend.name);
    this._addHandleData(handle, data);
  }
  async _addToBox(arc, id, type, name, tags, data, friend) {
    const {boxes} = this._state;
    // find a pre-existing box construct for this id
    let box = boxes[id];
    // if box exists, install the values if we have a handle, otherwise cache them
    if (box) {
      if (box.handle) {
        this._addHandleData(box.handle, data, friend);
        // inform owner that we updated this handle
        this._fire('handle', box.handle);
      } else {
        //RemoteFriendsSharedHandles.log(`caching friend's shared handle for boxing as [${id}]`);
        box.pending.push({data});
      }
    }
    // if box doesn't exist, create it, cache the values, and trigger async handle creation
    else {
      //RemoteFriendsSharedHandles.log(`creating box [${id}] for friend's shared handle `);
      box = boxes[id] = {
        pending: [{data}]
      };
      box.handle = await this._requireHandle(arc, id, type, name, tags);
      box.pending.forEach(m => this._addHandleData(box.handle, m.data, friend));
      // inform owner that we updated this handle
      this._fire('handle', box.handle);
    }
  }
  async _requireHandle(arc, id, type, name, tags) {
    return arc.context.findHandleById(id) || await arc.context.newHandle(type, name, id, tags);
  }
  _addHandleData(handle, data, friend) {
    ArcsUtils.addHandleData(handle, data);
    RemoteFriendsSharedHandles.log(`added [${friend.name}'s] shared data to handle [${handle.id}]`, data);
  }
}

RemoteFriendsSharedHandles.log = Xen.Base.logFactory('RemoteFriendsSHs', '#805acb');
customElements.define('remote-friends-shared-handles', RemoteFriendsSharedHandles);
