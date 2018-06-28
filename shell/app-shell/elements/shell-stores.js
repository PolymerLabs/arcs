/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';
import ArcsUtils from '../lib/arcs-utils.js';
import Const from '../constants.js';
import './arc-handle.js';

// templates
const template = Xen.html`

  <arc-handle arc="{{arc}}" data="{{themeData}}" options="{{themeStoreOptions}}" on-change="_onShellThemeChange"></arc-handle>
  <arc-handle arc="{{arc}}" data="{{userStoreData}}" options="{{userStoreOptions}}"></arc-handle>
  <arc-handle arc="{{arc}}" data="{{usersStoreData}}" options="{{usersStoreOptions}}"></arc-handle>
  <!-- <arc-handle arc="{{arc}}" data="{{arcsStoreData}}" options="{{arcsStoreOptions}}" on-change="_onArcsStoreChange"></arc-handle> -->
  <!-- <arc-handle arc="{{arc}}" options="{{neoboxAvatarStoreOptions}}"></arc-handle> -->
  <!-- <arc-handle arc="{{arc}}" options="{{neoboxFriendsStoreOptions}}"></arc-handle> -->
  <!-- ensures #BOXED_avatar exists for resolving recipes, even if there are no avatars to box -->
  <!-- <arc-handle arc="{{arc}}" options="{{boxedAvatarStoreOptions}}"></arc-handle> -->
  <!-- testing out custom storage provider -->
  <arc-handle arc="{{arc}}" options="{{scottBoxedStoreOptions}}"></arc-handle>
`;

const log = Xen.logFactory('ShellStores', '#004f00');
const warn = Xen.logFactory('ShellStores', '#004f00', 'warn');

class ShellStores extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'config', 'users', 'user', 'arcs', 'arc'];
  }
  get template() {
    return template;
  }
  _getInitialState() {
    this._watchGeolocation();
    return {
      defaultThemeData: {
        mainBackground: 'white'
      }
    };
  }
  _watchGeolocation() {
    const fallback = () => this._maybeUpdateGeoCoords({latitude: 37.7610927, longitude: -122.4208173}); // San Francisco
    if ('geolocation' in navigator) {
      const update = ({coords}) => this._maybeUpdateGeoCoords(coords);
      navigator.geolocation.watchPosition(update, fallback, {timeout: 3000, maximumAge: Infinity});
    } else {
      fallback();
    }
  }
  _maybeUpdateGeoCoords({latitude, longitude}) {
    const {geoCoords} = this._state;
    // Skip setting the position if it's the same as what we've already got.
    if (!geoCoords || geoCoords.latitude != latitude || geoCoords.longitude != longitude) {
      this._setState({geoCoords: {latitude, longitude}});
    }
  }
  _configState(config) {
    const typesPath = `${config.root}/app-shell/artifacts`;
    this._setState({
      // arcsStoreOptions: {
      //   schemas: `${typesPath}/arc-types.manifest`,
      //   type: '[ArcMetadata]',
      //   name: 'ArcMetadata',
      //   tags: ['arcmetadata']
      // },
      themeStoreOptions: {
        schemas: `${typesPath}/arc-types.manifest`,
        type: 'Theme',
        name: 'ShellTheme',
        tags: ['shelltheme']
      },
      userStoreOptions: {
        schemas: `${typesPath}/identity-types.manifest`,
        type: 'Person',
        name: 'User',
        tags: ['user']
      },
      usersStoreOptions: {
        schemas: `${typesPath}/identity-types.manifest`,
        type: '[Person]',
        name: 'Users',
        tags: ['identities']
      },
      // boxedAvatarStoreOptions: {
      //   schemas: `${typesPath}/identity-types.manifest`,
      //   type: '[Avatar]',
      //   name: 'Avatars',
      //   tags: [`${Const.HANDLES.boxed}_avatar`],
      //   id: `${Const.HANDLES.boxed}_avatar`,
      //   asContext: true
      // },
      // neoboxAvatarStoreOptions: {
      //   schemas: `${typesPath}/identity-types.manifest`,
      //   type: '[Avatar]',
      //   name: 'NEOBOX_avatar',
      //   tags: [`NEOBOX_avatar`],
      //   id: `NEOBOX_avatar`,
      //   asContext: true
      // },
      // neoboxFriendsStoreOptions: {
      //   schemas: `${typesPath}/identity-types.manifest`,
      //   type: '[Person]',
      //   name: 'NEOBOX_friends',
      //   tags: [`NEOBOX_friends`],
      //   id: `NEOBOX_friends`,
      //   asContext: true
      // },
      scottBoxedStoreOptions: {
        storageKey: 'scott://noid',
        schema: {tag: 'Entity', data: {names: ['Scottfo'], fields: {scottitude: 'Number'}}},
        type: '[Scottfo]',
        name: 'Scottfo',
        tags: [`${Const.HANDLES.boxed}_scottfo`],
        id: `${Const.HANDLES.boxed}_scottfo`,
        asContext: true
      }
    });
  }
  _update(props, state, oldProps, oldState) {
    const {config, users, user, arcs, arc, key} = props;
    if (config) {
      if (!state.config) {
        state.config = config;
        this._configState(config);
      }
      const {geoCoords} = state;
      if (key && (key !== oldProps.key)) {
        state.themeData = Object.assign({key}, state.defaultThemeData);
      }
      if (user && (user !== oldProps.user || geoCoords !== oldState.geoCoords)) {
        state.userStoreData = this._renderUser(user, geoCoords);
      }
      if (users && (users !== oldProps.users || !state.usersStoreData)) {
        state.usersStoreData = this._renderUsers(users);
      }
      // if (arcs !== oldProps.arcs) {
      //   state.arcsStoreData = this._renderArcs(user, arcs);
      // }
    }
  }
  _render(props, state) {
    return [state, props];
  }
  _renderUser(user, geoCoords) {
    return {
      id: user.id,
      name: user.info.name,
      location: geoCoords || null
    };
  }
  _renderUsers(users) {
    return Object.keys(users).map(id => {
      return {
        id: id,
        name: users[id].name
      };
    });
  }
  // _renderArcs(user, arcs) {
  //   const data = [];
  //   Object.keys(arcs || Object).forEach(key => {
  //     const arc = arcs[key];
  //     if (!arc.deleted) {
  //       let metadata = arc.metadata || {};
  //       const href = `${location.origin}${location.pathname}?arc=${key}&user=${user.id}`;
  //       data.push({
  //         key: key,
  //         href: href,
  //         description: metadata.description,
  //         color: metadata.color || 'gray',
  //         bg: metadata.bg,
  //         touched: arc.touched,
  //         starred: arc.starred,
  //         share: metadata.share
  //       });
  //     }
  //   });
  //   return data;
  // }
  // _onData(e, data) {
  //   if (this._setState({[e.type]: data})) {
  //     log(e.type, data);
  //   }
  // }
  async _onShellThemeChange(e, handle) {
    const themeEntity = await ArcsUtils.getStoreData(handle);
    if (themeEntity) {
      const theme = themeEntity.rawData;
      log('onShellThemeChange', theme);
      this._fire('theme', theme);
    }
  }
  // async _onArcsStoreChange(e, handle) {
  //   const old = this._props.arcs;
  //   if (old) {
  //     log('onArcsStoreChange: waiting to getStoreData');
  //     const data = await ArcsUtils.getStoreData(handle);
  //     log('onArcsStoreChange: got data: ', data);
  //     let dirty = false;
  //     // This implementation keeps transformation between Firebase data and Store data
  //     // entirely in this module (doesn't leak Store data format), which is good.
  //     // However, it's probably better to construct a change set and plumb that through
  //     // to cloud-data which can use the deltas to update the database more selectively.
  //     const arcs = {};
  //     data.forEach(entity => {
  //       entity = entity.rawData;
  //       let arc = old[entity.key];
  //       if (arc) {
  //         if (entity.deleted) {
  //           dirty = true;
  //           arc.deleted = entity.deleted;
  //         } else if (entity.starred !== arc.starred) {
  //           dirty = true;
  //           arc = Xen.clone(arc);
  //           arc.starred = Boolean(entity.starred);
  //         }
  //         arcs[entity.key] = arc;
  //       }
  //     });
  //     if (dirty) {
  //       this._fire('arcs', arcs);
  //     }
  //   }
  // }
}
customElements.define('shell-stores', ShellStores);
