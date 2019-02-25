
import {Utils} from '../../lib/utils.js';
import {now} from '../../../build/platform/date-web.js';
import {UserArcs} from '../../lib/user-arcs.js';
import {UserContext} from '../../lib/user-context.js';

const t0 = now();

export const App = async callback => {
  await user(callback);
};

const user = async callback => {
  //const storage = 'volatile://';
  const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_6_0`;
  const userid = 'testuserray';
  report(storage, userid);
  const userArcs = new UserArcs(storage, userid);
  userArcs.subscribe(change => callback(change, Math.floor(now() - t0)));
  const context = await Utils.parse('');
  const userContext = new UserContext();
  userContext.init(storage, userid, context);
  console.log(userContext);
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
