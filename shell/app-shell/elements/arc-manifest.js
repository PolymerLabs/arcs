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
  _getInitialState() {
    return {
      defaultManifest: `
import 'https://sjmiles.github.io/arcs-stories/0.4/GitHubDash/GitHubDash.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/TV/TV.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/PlaidAccounts/PlaidAccounts.recipes'
import '${window.shellPath}/artifacts/canonical.manifest'
import '${window.shellPath}/artifacts/Arcs/Arcs.recipes'
      `
    };
  }
  _update({config}, state, oldProps) {
    if (config && !state.manifest) {
      if (config.solo) {
        state.manifest = `import '${config.solo}'`;
      } else {
        state.manifest = state.defaultManifest;
      }
      this._fire('manifest', state.manifest);
    }
  }
}
customElements.define('arc-manifest', ArcManifest);
