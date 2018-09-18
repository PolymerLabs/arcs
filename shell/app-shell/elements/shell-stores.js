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
import './arc-store.js';
import {FbStore} from './fb-data/FbStore.js';

// templates
const template = Xen.html`
  <!-- <arc-store arc="{{arc}}" data="{{themeData}}" options="{{themeStoreOptions}}" on-change="_onShellThemeChange"></arc-store>
  <arc-store arc="{{arc}}" data="{{userStoreData}}" options="{{userStoreOptions}}"></arc-store>
  <arc-store arc="{{arc}}" data="{{usersStoreData}}" options="{{usersStoreOptions}}"></arc-store>-->
  <!-- we require BOXED_avatar a-priori -->
  <!--<arc-store arc="{{arc}}" options="{{boxedAvatarOptions}}"></arc-store> -->
`;

const log = Xen.logFactory('ShellStores', '#004f00');

class ShellStores extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'config', 'users', 'user', 'arc', 'context'];
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
    const typesPath = `${config.root}/shell/app-shell/artifacts`;
    this._setState({
      themeStoreOptions: {
        schemas: `${typesPath}/arc-types.manifest`,
        type: 'Theme',
        id: 'ShellTheme',
        name: 'ShellTheme',
        tags: ['shelltheme']
      },
      userStoreOptions: {
        schemas: `${typesPath}/identity-types.manifest`,
        type: 'Person',
        id: 'User',
        name: 'User',
        tags: ['user']
      },
      user0StoreOptions: {
        schema: {
          tag: 'Entity',
          data: {
            names: ['User0'],
            fields: {
              'id': 'Text',
              'name': 'Text',
              'location': 'Object'
            }
          }
        },
        type: 'User0',
        id: 'User0',
        name: 'User0',
        tags: ['user0']
      },
      usersStoreOptions: {
        schemas: `${typesPath}/identity-types.manifest`,
        type: '[Person]',
        id: 'Users',
        name: 'Users',
        tags: ['identities']
      },
      boxedAvatarOptions: {
        schema: {tag: 'Entity', data: {names: ['Avatar'], fields: {url: 'URL', owner: 'Text'}}},
        type: '[Avatar]',
        name: 'BOXED_avatar',
        id: 'BOXED_avatar',
        tags: ['BOXED_avatar'],
        asContext: true
      }
    });
  }
  _update(props, state, oldProps, oldState) {
    const {config, users, user, key, context} = props;
    if (config) {
      if (!state.config) {
        state.config = config;
        this._configState(config);
      }
      if (users && (users !== oldProps.users || !state.usersStoreData)) {
        state.usersStoreData = this._renderUsers(users);
      }
      if (user && (user !== oldProps.user || state.geoCoords !== oldState.geoCoords)) {
        state.userStoreData = this._renderUser(user, state.geoCoords);
      }
      if (key && (key !== oldProps.key)) {
        state.themeData = Object.assign({key}, state.defaultThemeData);
      }
      this._updateUser(props, state, oldState);
    }
  }
  async _updateUser({context, user}, state, oldState) {
    const {userStore} = state;
    if (context && !userStore) {
      this._setState({userStore: await FbStore.createContextStore(context, state.user0StoreOptions)});
    }
    if (userStore && user && (user !== state.user || state.geoCoords !== oldState.geoCoords)) {
      state.user = user;
      log('setting User0 data');
      //const entity = this._renderUser(user, state.geoCoords);
      userStore.set({id: userStore.generateID(), rawData: {name: user.info.name}});
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
  async _onShellThemeChange(e, handle) {
    const themeEntity = await ArcsUtils.getStoreData(handle);
    if (themeEntity) {
      const theme = themeEntity.rawData;
      log('onShellThemeChange', theme);
      this._fire('theme', theme);
    }
  }
}
customElements.define('shell-stores', ShellStores);
