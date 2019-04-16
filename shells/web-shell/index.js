// process debug flags
import '../lib/platform/loglevel-web.js';
// (optional) database support
import '../lib/database/firebase-support.js';
import '../lib/database/pouchdb-support.js';
// (optional) devtools support
import {DevtoolsSupport} from '../lib/runtime/devtools-support.js';
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
