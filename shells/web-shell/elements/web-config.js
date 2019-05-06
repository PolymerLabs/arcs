/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../lib/components/xen.js';
import {ProcessConfig} from '../../lib/components/process-config.js';
import {Const} from '../../configuration/constants.js';

const log = Xen.logFactory('WebConfig', '#60ac66');

const configOptions = {
  //configPropertyName: {
  //  aliases: [...] // aliases for configPropertyName
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
  arc: {
    aliases: ['arckey'],
    persistToUrl: true
  },
  search: {
  },
  plannerStorage: {
    localStorageKey: Const.LOCALSTORAGE.plannerStorage,
    default: Const.DEFAULT.plannerStorageKey
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
  update({userid, arckey}, state) {
    if (!state.config) {
      const params = (new URL(document.location)).searchParams;
      state.config = ProcessConfig.processConfig(configOptions, params);
      state.config.plannerDebug = !state.config.plannerNoDebug;
      state.config.storage = this.expandStorageMacro(state.config.storage);
      this._fire('config', state.config);
    }
    if (arckey !== undefined) {
      state.config.arc = arckey;
    }
    if (userid !== undefined) {
      state.config.userid = userid;
    }
    ProcessConfig.persistParams(configOptions, state.config);
    // TODO(sjmiles): only works if config is a Highlander
    WebConfig.config = state.config;
  }
  // TODO(sjmiles): make this a ProcessConfig ability(?)
  // support some macros in storage keys
  expandStorageMacro(storage) {
    return storage
      .replace('$firebase', configOptions.storage.map.firebase)
      .replace('$pouchdb', configOptions.storage.map.pouchdb)
      .replace('$pouch', configOptions.storage.map.pouch)
      ;
  }
}
customElements.define('web-config', WebConfig);
