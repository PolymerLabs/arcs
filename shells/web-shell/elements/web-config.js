/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../lib/xen.js';
import {Const} from '../../configuration/constants.js';

const log = Xen.logFactory('WebConfig', '#60ac66');

export class WebConfig extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['userid', 'arckey'];
  }
  _update({userid, arckey}, state, oldProps) {
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
    this.setUrlParam('search', null);
    // if (search && search !== oldProps.search) {
    //   ArcUtils.setUrlParam('search', search);
    // }
  }
  basicConfig() {
    const params = (new URL(document.location)).searchParams;
    return {
      //modality: 'dom',
      //root: params.get('root') || window.arcsPath,
      //manifestPath: params.get('manifest'),
      //solo: params.get('solo'),
      //defaultManifest: window.defaultManifest,
      storage: params.get('storage') || localStorage.getItem(Const.LOCALSTORAGE.storage),
      userid: params.get('user') || localStorage.getItem(Const.LOCALSTORAGE.user),
      arckey: params.get('arc'),
      search: params.get('search') || '',
      plannerStorage: params.get('plannerStorage') || localStorage.getItem(Const.LOCALSTORAGE.plannerStorage),
      plannerDebug: !params.has('plannerNoDebug'),
      plannerOnlyConsumer: params.has('plannerOnlyConsumer'),
      //urls: window.shellUrls || {},
      //useStorage: !params.has('legacy') && !params.has('legacy-store'),
      //useSerialization: !params.has('legacy')
    };
  }
  updateStorageConfig(config) {
    if (config.storage === 'firebase') {
      config.storage = Const.defaultFirebaseStorageKey;
    }
    if (config.storage === 'pouchdb') {
      config.storage = Const.defaultPouchdbStorageKey;
    }
    if (!config.storage || config.storage === 'default') {
      config.storage = Const.defaultStorageKey;
    }
    localStorage.setItem(Const.LOCALSTORAGE.storage, config.storage);
    localStorage.setItem(Const.LOCALSTORAGE.plannerStorage, config.plannerStorage);
    return config;
  }
  updateUserConfig(config) {
    if (!config.userid) {
      config.userid = Const.defaultUserId;
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
