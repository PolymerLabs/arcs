import {now} from '../../../build/platform/date-web.js';
import {Utils} from '../../lib/utils.js';
import {RamSlotComposer} from '../../lib/ram-slot-composer.js';
import {UserArcs} from '../../lib/user-arcs.js';
import {ArcHost} from '../../lib/arc-host.js';
//import {UserContext} from '../../lib/user-context.js';
import {ObserverTable} from './observer-table.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';

const t0 = now();

const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_6_0`;
const userid = 'testuserray';
const otherUserid = 'user';

export const App = async () => {
  try {
    await user();
  } catch (x) {
    console.error(x);
  }
  console.log('done.');
};

const user = async () => {
  //const storage = 'volatile://';
  report(storage, userid);
  //
  spawnSharesArc(storage);
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
  //
  const otherUserArcs = new UserArcs(storage, otherUserid);
  otherUserArcs.subscribe(onChange);
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

const spawnLauncherArc = async (user, storage) => {
  // prepare rendering surface
  const composer = new RamSlotComposer();
  // prepare context
  const context = await Utils.parse('');
  // spawn arc via host (manages serialization)
  const host = new ArcHost(context, storage, composer);
  const arc = await host.spawn({id: `${user}-launcher`});
  console.log(arc._stores);
  return arc;
};

const fetchUserArcsStore = async (user, storage) => {
  const store = await SyntheticStores.getArcsStore(storage, `${userid}-launcher`);
  console.log(store);
  return store;
};

const spawnSharesArc = async (storage) => {
  //const launcher = spawnLauncherArc('user', storage);
  // prepare rendering surface
  const composer = new RamSlotComposer();
  // prepare context
  const context = await Utils.parse('');
  // spawn arc
  const arc = await Utils.spawn({id: 'shares-arc', composer, context, storage});
  // record metadata
  const meta = {description: 'shares arc', color: 'silver', key: 'shares-arc'};
  const store = await fetchUserArcsStore('user', storage);
  await store.store({id: 'shares-arc', rawData: meta}, [now()]);

};
