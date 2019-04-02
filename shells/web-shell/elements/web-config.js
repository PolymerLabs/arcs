/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../lib/components/xen.js';
import {Const} from '../../configuration/constants.js';

const log = Xen.logFactory('WebConfig', '#60ac66');

const configOptions = {
  storage: {
    aliases: ['storageKey'],
    default: Const.DEFAULT.storageKey,
    map: {
      'firebase': Const.DEFAULT.firebaseStorageKey,
      'pouchdb': Const.DEFAULT.pouchdbStorageKey,
      'pouch': Const.DEFAULT.pouchdbStorageKey,
      'volatile': Const.DEFAULT.volatileStorageKey,
      'default': Const.DEFAULT.storageKey
    },
    localStorageKey: Const.LOCALSTORAGE.storage,
    //stripFromURL: false,
    //persistToURL: false
  },
  userid: {
    aliases: ['user'],
    localStorageKey: Const.LOCALSTORAGE.user
  },
  arckey: {
    aliases: ['arc']
  },
  search: {
  },
  plannerStorage: {
    localStorageKey: Const.LOCALSTORAGE.plannerStorage,
  },
  plannerNoDebug: {
  },
  plannerOnlyConsumer: {
  }
};

export class WebConfig extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['userid', 'arckey'];
  }
  update({userid, arckey}, state, oldProps) {
    this.processConfig(configOptions);
    if (!state.config) {
      const config = this.basicConfig();
      this.updateUserConfig(config);
      this.updateStorageConfig(config);
      this._fire('config', config);
      state.config = config;
    }
    // TODO(sjmiles): persisting user makes it hard to share by copying URL
    // ... but not having it makes it hard to test multi-user scenarios
    //this.setUrlParam('user', null);
    if (userid) {
      localStorage.setItem(Const.LOCALSTORAGE.user, userid);
    }
    if (arckey != null) {
      this.setUrlParam('arc', arckey);
    }
    // TODO(sjmiles): persisting search term is confusing in practice, avoid for now
    //this.setUrlParam('search', null);
    // if (search && search !== oldProps.search) {
    //   ArcUtils.setUrlParam('search', search);
    // }
  }
  basicConfig() {
    const params = (new URL(document.location)).searchParams;
    return {
      storage: params.get('storage') || localStorage.getItem(Const.LOCALSTORAGE.storage),
      userid: params.get('user') || localStorage.getItem(Const.LOCALSTORAGE.user),
      arckey: params.get('arc'),
      search: params.get('search') || '',
      plannerStorage: params.get('plannerStorage') || localStorage.getItem(Const.LOCALSTORAGE.plannerStorage),
      plannerDebug: !params.has('plannerNoDebug'),
      plannerOnlyConsumer: params.has('plannerOnlyConsumer'),
    };
  }
  updateStorageConfig(config) {
    if (config.storage === 'firebase') {
      config.storage = Const.DEFAULT.firebaseStorageKey;
    }
    if (config.storage === 'pouchdb') {
      config.storage = Const.DEFAULT.pouchdbStorageKey;
    }
    if (config.storage === 'volatile') {
      config.storage = Const.DEFAULT.volatileStorageKey;
    }
    if (!config.storage || config.storage === 'default') {
      config.storage = Const.DEFAULT.storageKey;
    }
    localStorage.setItem(Const.LOCALSTORAGE.storage, config.storage);
    if (!config.plannerStorage || config.plannerStorage === 'default') {
      config.plannerStorage = Const.DEFAULT.plannerStorageKey;
    }
    localStorage.setItem(Const.LOCALSTORAGE.plannerStorage, config.plannerStorage);
    return config;
  }
  updateUserConfig(config) {
    if (!config.userid) {
      config.userid = Const.DEFAULT.userId;
    }
  }
  processConfig(options) {
    const config = {};
    const params = (new URL(document.location)).searchParams;
    Object.keys(options).forEach(key => config[key] = this.processConfigOption(params, key, options[key]));
    log(config);
  }
  processConfigOption(params, name, option) {
    let names = [name];
    if (option.aliases) {
      names = names.concat(option.aliases);
    }
    const param = names.find(name => params.has(name));
    //
    let value;
    if (param) {
      // use user-supplied value if available
      value = params.get(param);
    } else {
      // use local storage value if available
      if (option.localStorageKey) {
        value = localStorage.getItem(option.localStorageKey);
      }
      // otherwise use default value
      if (!value) {
        value = option.default;
      }
    }
  }
  setUrlParam(name, value) {
    // TODO(sjmiles): memoize url
    const url = new URL(document.location.href);
    if (!value) {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, value);
    }
    window.history.replaceState({}, '', decodeURIComponent(url.href));
  }
}
customElements.define('web-config', WebConfig);
