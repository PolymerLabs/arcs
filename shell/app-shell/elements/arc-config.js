/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';
import Const from '../constants.js';
import Utils from '../lib/arcs-utils.js';

class ArcConfig extends Xen.Base {
  static get observedAttributes() {
    return ['userid', 'key', 'search'];
  }
  _update({userid, key, search}, state, oldProps) {
    if (!state.config) {
      state.config = this._configure();
      // TODO(sjmiles): default to Gomer for now, but should have a proper 'no user' state
      if (!state.config.userid) {
        state.config.userid = `LAUKAIqnN0dB1ceeoT2`;
      }
      this._fire('config', state.config);
    }
    // TODO(sjmiles): persisting user makes it hard to share by copying URL
    Utils.setUrlParam('user', null);
    if (userid && userid !== oldProps.userid) {
      localStorage.setItem(Const.LOCALSTORAGE.user, userid);
    }
    if (key && key !== oldProps.key) {
      Utils.setUrlParam('arc', !Const.SHELLKEYS[key] ? key : '');
    }
    // TODO(sjmiles): persisting search term is confusing in practice, avoid for now
    // if (search && search !== oldProps.search) {
    //   Utils.setUrlParam('search', search);
    // }
  }
  _configure() {
    const params = (new URL(document.location)).searchParams;
    return {
      affordance: 'dom',
      root: params.get('root') || window.shellPath,
      manifestPath: params.get('manifest'),
      solo: params.get('solo'),
      defaultManifest: window.defaultManifest,
      userid: params.get('user') || localStorage.getItem(Const.LOCALSTORAGE.user),
      key: params.get('arc') || null,
      search: params.get('search') || '',
      urls: window.shellUrls || {},
      useStorage: false
    };
  }
}
customElements.define('arc-config', ArcConfig);
