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
  //configPropertyName: {
  //  aliases: [...] // parameter aliases for configPropertyName
  //  default: ... // default value
  //  map: { ... } // map human parameter names to actual config values
  //  localStorageKey: "..." // key for persisting to/from localStorage
  //  persistToUrl: <Boolean> // whether parameter should be written into URL
  //},
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
    localStorageKey: Const.LOCALSTORAGE.storage
  },
  userid: {
    aliases: ['user'],
    localStorageKey: Const.LOCALSTORAGE.user
  },
  arckey: {
    aliases: ['arc'],
    persistToUrl: true
  },
  search: {
  },
  plannerStorage: {
    localStorageKey: Const.LOCALSTORAGE.plannerStorage,
  },
  plannerNoDebug: {
    boolean: true
  },
  plannerOnlyConsumer: {
    boolean: true
  }
};

export class WebConfig extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['userid', 'arckey'];
  }
  update({userid, arckey}, state, oldProps) {
    if (!state.config) {
      state.config = this.processConfig(configOptions);
      this._fire('config', state.config);
    }
    if (userid) {
      state.config.userid = userid;
    }
    if (arckey) {
      state.config.arckey = arckey;
    }
    this.persistParams(configOptions, state.config);
  }
  processConfig(options) {
    const config = {};
    const params = (new URL(document.location)).searchParams;
    Object.keys(options).forEach(key => config[key] = this.processConfigOption(params, key, options[key]));
    log(config);
    return config;
  }
  processConfigOption(params, name, option) {
    let names = [name];
    if (option.aliases) {
      names = names.concat(option.aliases);
    }
    let value;
    if (option.boolean) {
      value = false;
    }
    // use URL param if available
    const param = names.find(name => params.has(name));
    if (param) {
      const paramValue = params.get(param);
      // normally, simple existence of a parameter makes it true,
      // but we'll also handle folks doing `booleanParameter=false`
      value = option.boolean ? paramValue !== 'false' : paramValue;
    } else {
      // use local storage value if available
      if (option.localStorageKey) {
        value = localStorage.getItem(option.localStorageKey);
      }
      // otherwise use default value
      if (!value && ('default' in option)) {
        value = option.default;
      }
    }
    // map shorthand names to longform values
    if (option.map) {
      const mapValue = option.map[value];
      if (mapValue !== undefined) {
        value = mapValue;
      }
    }
    return value;
  }
  persistParams(options, config) {
    Object.keys(options).forEach(key => this.persistParam(key, options[key], config[key]));
  }
  persistParam(name, {localStorageKey, persistToUrl}, value) {
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, value);
    }
    if (persistToUrl) {
      this.setUrlParam(name, value);
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
