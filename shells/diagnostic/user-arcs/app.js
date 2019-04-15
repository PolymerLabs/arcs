import {now} from '../../../build/platform/date-web.js';
import {Utils} from '../../lib/utils.js';
import {RamSlotComposer} from '../../components/ram-slot-composer.js';
import {UserArcs} from '../../lib/user-arcs.js';
import {ArcHost} from '../../lib/components/arc-host.js';
//import {UserContext} from '../../lib/user-context.js';
import {ObserverTable} from './observer-table.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';

const t0 = now();

export const App = async () => {
  try {
    await user();
  } catch (x) {
    console.error(x);
  }
  console.log('done.');
};

const user = async () => {
  const user = {
    publicKey: `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_7_0/sjmiles`,
    persona: 'user'
  };
  //
  report(user.publicKey, user.persona);
  //
  spawnSharesArc(user);
  spawnFriendsArc(user);
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
  const userArcs = new UserArcs(user.publicKey, user.persona);
  userArcs.subscribe(onChange);
  //
  // const otherUserArcs = new UserArcs(storage, otherUserid);
  // otherUserArcs.subscribe(onChange);
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

const spawnLauncherArc = async user => {
  // prepare rendering surface
  const composer = new RamSlotComposer();
  // prepare context
  const context = await Utils.parse('');
  // spawn arc via host (manages serialization)
  const host = new ArcHost(context, user.publicKey, composer);
  const arc = await host.spawn({id: `${user.persona}-launcher`});
  console.log(arc._stores);
  return arc;
};

const fetchUserArcsStore = async user => {
  const store = await SyntheticStores.getArcsStore(user.publicKey, `${user.persona}-launcher`);
  console.log(store);
  return store;
};

const spawnSharesArc = async user => {
  // prepare rendering surface
  const composer = new RamSlotComposer();
  // prepare context
  const context = await Utils.parse('');
  // spawn arc
  const id = `${user.persona}-shares`;
  /*const arc =*/ await Utils.spawn({id, composer, context, storage: user.publicKey});
  // record metadata
  recordArcMeta(user, {description: 'shares arc', color: 'silver', key: id});
};

const spawnFriendsArc = async user => {
  // prepare rendering surface
  const composer = new RamSlotComposer();
  // prepare context
  const context = await Utils.parse('');
  // spawn arc
  const id = `${user.persona}-friends`;
  const arc = await Utils.spawn({id, composer, context, storage: user.publicKey});
  // record metadata
  recordArcMeta(user, {description: 'friends arc', color: 'silver', key: id});
};

const recordArcMeta = async (user, meta) => {
  const store = await fetchUserArcsStore(user);
  await store.store({id: meta.key, rawData: meta}, [now()]);
};
