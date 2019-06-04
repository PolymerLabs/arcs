/**
 * @license
 * Copyright 2019 Google LLC.
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
  /*
    configPropertyName: {
      aliases: [...] // aliases for configPropertyName
      default: ... // default value
      map: { ... } // map human parameter names to actual config values
      localStorageKey: "..." // key for persisting to/from localStorage
      persistToUrl: <Boolean> // whether parameter should be written into URL
    }
  */
  storage: {
    aliases: ['storageKey', 'persona'],
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
  userHistoryJson: {
    default: '[]',
    localStorageKey: Const.LOCALSTORAGE.userHistory
  },
  arc: {
    aliases: ['arckey'],
    persistToUrl: true
  },
  search: {
  },
  plannerStorage: {
    aliases: ['planner'],
    default: Const.DEFAULT.plannerStorageKey,
    localStorageKey: Const.LOCALSTORAGE.plannerStorage
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
    return ['arckey'];
  }
  update({arckey}, {config}) {
    if (!config) {
      const params = (new URL(document.location)).searchParams;
      config = ProcessConfig.processConfig(configOptions, params);
      config.version = Const.version;
      config.plannerDebug = !config.plannerNoDebug;
      config.storage = this.expandStorageMacro(config.storage);
      this.state = {config};
    }
    if (arckey !== undefined) {
      config.arc = arckey;
    }
    this.updateUserHistory(config);
    log(config.userHistory);
    ProcessConfig.persistParams(configOptions, config);
    // TODO(sjmiles): only works if config is Highlander
    WebConfig.config = config;
    this._fire('config', config);
  }
  updateUserHistory(config) {
    const {userHistoryJson, storage} = config;
    const userHistory = JSON.parse(userHistoryJson);
    if (userHistory.indexOf(storage) < 0) {
      userHistory.push(storage);
    }
    config.userHistory = userHistory;
    config.userHistoryJson = JSON.stringify(userHistory);
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
