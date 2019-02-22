import {Xen} from '../lib/xen.js';
import {DevtoolsConnection} from '../../build/runtime/debug/devtools-connection.js';
// optional firebase support
import '../lib/build/firebase.js';
import '../../build/runtime/storage/firebase/firebase-provider.js';
// optional pouchdb support
import '../lib/build/pouchdb.js';
import '../../build/runtime/storage/pouchdb/pouchdb-provider.js';
// whitelist components
import '../configuration/whitelisted.js';

const params = (new URL(document.location)).searchParams;
const logLevel = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);

window.debugLevel = Xen.Debug.level = logLevel;

(async () => {
  if (params.has('remote-explore-key')) {
    // Wait for the remote Arcs Explorer to connect before starting the Shell.
    DevtoolsConnection.ensure();
    await DevtoolsConnection.onceConnected;
  }

  document.querySelector('body').appendChild(document.createElement('web-shell'));
  // configure root path
  Object.assign(document.querySelector('web-shell'), {
    root: '../..' // path to arcs/
  });
})();
