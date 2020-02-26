/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// process debug flags
import '../lib/platform/loglevel-web.js';
// (optional) devtools support
import {DevtoolsSupport} from '../lib/devtools-support.js';
// whitelist components
import '../configuration/whitelisted.js';
// shell
import './elements/web-shell.js';

(async () => {
  // TODO(sjmiles): this is config work, it can be done in web-config.js which
  // already blocks web-shell
  await DevtoolsSupport();
  // web-shell blocks until root is provided
  document.querySelector('web-shell').root = '../..';
})();
