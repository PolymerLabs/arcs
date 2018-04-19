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

/* global shellPath */

class ArcConfig extends Xen.Base {
  static get observedAttributes() { return ['']; }
  _update(props, state) {
    this._fire('config', this._configure());
  }
  _configure() {
    let params = (new URL(document.location)).searchParams;
    return {
      affordance: 'dom',
      root: params.get('root') || shellPath,
      manifestPath: params.get('manifest'),
      soloPath: params.get('solo'),
      user: params.get('user') || localStorage.getItem(Const.LOCALSTORAGE.user),
      key: params.get('arc') || null,
      search: params.get('search'),
      arcsToolsVisible: localStorage.getItem(Const.LOCALSTORAGE.tools) === 'open',
      urls: {},
      useStorage: false
    };
  }
}
customElements.define('arc-config', ArcConfig);
