// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import AppShell from '../../app-shell/app-shell.js';

class VrAppShell extends AppShell {
  _getInitialState() {
    const state = super._getInitialState();
    state.defaultManifest = `
import 'https://$shell/artifacts/Vr/recipes.manifest'
import 'https://$shell/artifacts/VideoPlayer/Vr/VideoPlayer.recipes'
import 'https://$shell/artifacts/Messages/Vr/Vr.recipes'
    `;
    return state;
  }
  _updateConfig(state, oldState) {
    super._updateConfig(state, oldState);
    const {config} = state;
    if (config) {
      config.containerKind = 'a-entity';
      // vr only
      config.soloPath = 'arc.manifest';
      // no launcher
      config.key = config.key || '*';
    }
  }
}
customElements.define('vr-app-shell', VrAppShell);

