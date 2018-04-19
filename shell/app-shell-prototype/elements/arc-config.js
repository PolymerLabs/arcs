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

/* global shellPath */

class ArcConfig extends Xen.Base {
  static get observedAttributes() {
    return ['userid', 'key', 'search'];
  }
  _update({userid, key, search}, state, oldProps) {
    if (!state.config) {
      state.config = this._configure();
      this._fire('config', state.config);
    }
    if (userid && userid !== oldProps.userid) {
      localStorage.setItem(Const.LOCALSTORAGE.user, userid);
      Utils.setUrlParam('user', userid);
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
      root: params.get('root') || shellPath,
      manifestPath: params.get('manifest'),
      soloPath: params.get('solo'),
      userid: params.get('user') || localStorage.getItem(Const.LOCALSTORAGE.user),
      key: params.get('arc') || null,
      search: params.get('search') || '',
      urls: {},
      useStorage: false
    };
  }
}
customElements.define('arc-config', ArcConfig);
