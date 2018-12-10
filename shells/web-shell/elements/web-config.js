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
      state.config = this._configure();
      if (!state.config.storage) {
        state.config.storage = Const.defaultStorageKey;
      }
      localStorage.setItem(Const.LOCALSTORAGE.storage, state.config.storage);
      if (!state.config.userid) {
        state.config.userid = Const.defaultUserId;
      }
      this._fire('config', state.config);
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
  _configure() {
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
      plannerStorage: params.get('plannerStorage') || params.get('plannerStorageKeyBase') || params.get('storageKeyBase'),
      plannerDebug: params.get('plannerDebug'),
      plannerOnlyConsumer: params.get('plannerOnlyConsumer') || params.get('onlyConsumer') === 'true',
      //urls: window.shellUrls || {},
      //useStorage: !params.has('legacy') && !params.has('legacy-store'),
      //useSerialization: !params.has('legacy')
    };
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
