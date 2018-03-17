// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import AppShell from '../../app-shell/app-shell.js';

class VrAppShell extends AppShell {
  _consumeConfig(state, config) {
    config.containerKind = 'a-entity';
    config.soloPath = 'arc.manifest';
    config.key = config.key || '*';
    super._consumeConfig(state, config);
  }
}
customElements.define('vr-app-shell', VrAppShell);

