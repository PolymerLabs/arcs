import '../../lib/pouchdb-support.js';
import '../../lib/firebase-support.js';
import '../../lib/loglevel-web.js';
//import '../../configuration/whitelisted.js';
import {now} from '../../../build/platform/date-web.js';
import {Utils} from '../../lib/utils.js';
import {UserArcs} from '../../lib/user-arcs.js';
import {UserContext} from '../../lib/user-context.js';
import {ObserverTable} from './observer-table.js';

const t0 = now();

const user = async () => {
  //const storage = 'volatile://';
  const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_6_0`;
  const userid = 'testuserray';
  report(storage, userid);
  //
  // const context = await Utils.parse('');
  // const userContext = new UserContext();
  // userContext.init(storage, userid, context);
  //
  const ot = new ObserverTable('arcs');
  const onChange = change => {
    //console.log(`seein' them arcs: `, change.add.rawData.description);
    ot.onChange(change, Math.floor(now() - t0));
    //userContext.onArc(change);
  };
  //
  const userArcs = new UserArcs(storage, userid);
  userArcs.subscribe(onChange);
};

const report = (storage, userid) => {
  const table = document.body.querySelector(`#user tbody`);
  table.appendChild(Object.assign(document.createElement('tr'), {
    innerHTML: `<tr><th>storage</th><td>${storage}</td>`
  }));
  table.appendChild(Object.assign(document.createElement('tr'), {
    innerHTML: `<tr><th>userid</th><td>${userid}</td>`
  }));
};

// run
(async () => {
  try {
    // configure arcs environment
    Utils.init('../../..');
    // create a composer
    //const composer = new RamSlotComposer();
    // run app
    await user();
  } catch (x) {
    console.error(x);
  }
  console.log('done.');
})();
