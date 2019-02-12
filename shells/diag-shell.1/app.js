
import {Utils} from '../lib/utils.js';
import {now} from '../../build/platform/date-web.js';
import {UserArcs} from '../lib/user-arcs.js';

const t0 = now();

const user = async composer => {
  //const storage = 'volatile://';
  const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_6_0`;
  const userid = 'scott';
  const userArcs = new UserArcs(storage, userid);
  userArcs.subscribe(change => console.log(change, `${(now() - t0).toFixed(2)}ms`));
};

export const App = async composer => {
  user(composer);
};
