// process debug flags
import '../lib/loglevel-web.js';
// (optional) database support
import '../lib/firebase-support.js';
import '../lib/pouchdb-support.js';
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
