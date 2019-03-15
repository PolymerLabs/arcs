import '../../lib/pouchdb-support.js';
import '../../lib/firebase-support.js';
import '../../lib/loglevel-web.js';
//import '../../configuration/whitelisted.js';
import {Utils} from '../../lib/utils.js';
import {App} from './app.js';

// configure arcs environment
Utils.init('../../..');

// run our app
App();
