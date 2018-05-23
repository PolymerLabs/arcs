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

class ArcManifest extends Xen.Base {
  static get observedAttributes() {
    return ['config'];
  }
  _update({config}, state) {
    if (config && !state.manifest) {
      if (config.solo) {
        state.manifest = `import '${config.solo}'`;
      } else {
        state.manifest = config.defaultManifest;
      }
      this._fire('manifest', state.manifest);
    }
  }
}
customElements.define('arc-manifest', ArcManifest);
