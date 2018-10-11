import {Const} from '../configuration/constants.js';
import {SingleUserContext} from '../lib/single-user-context.js';
import {SyntheticStores} from '../lib/synthetic-stores.js';
import {ArcHost} from '../lib/arc-host.js';

const userid = `gomer`;
const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/${Const.version}`;
const launcherKey = `${userid}-launcher`;

export const App = async (env, composer) => {
  SyntheticStores.init(env);
  //
  const launcher = await SyntheticStores.getStore(storage, launcherKey);
  const arcsHandles = await launcher.toList();
  const arcsHandle = arcsHandles[0];
  //
  if (arcsHandle) {
    const arc = await createContextArc(env, storage, composer, userid);
    const userContext = await gatherContext(arc, arcsHandle, storage);
    createContextMapper(env, storage, composer, userid);
  }
};

const contextContext = `
import 'https://$artifacts/canonical.manifest'
`;

const createContextArc = async (env, storage, composer, userid) => {
  const id = `${userid}-persist-context`;
  const storesManifest = `import 'https://$artifacts/Profile/Sharing.stores'`;
  const storesContext = await env.parse(storesManifest);
  const storesImport = storesContext.imports[0];
  console.log(storesImport._stores.map(({id}) => id));
  const context = await env.parse(contextContext);
  const host = new ArcHost(env, context, storage, composer);
  const arc = await host.spawn({id, serialization: ''});
  storesImport._stores.forEach(({type, id}) => arc.createStore(type, null, id, null, null));
  return arc;
};

const gatherContext = async (context, arcsHandle, storage) => {
  const arcstore = await SyntheticStores.getHandleStore(arcsHandle);
  const isProfile = true;
  const userContext = new SingleUserContext(storage, context, userid, arcstore, isProfile);
  return userContext;
};

const reportShares = context => {
  const stores = context.stores || context._stores;
  console.log(`\n`);
  console.log(`=============================================================================`);
  console.log(stores.map(({id, model}) => ({id, size: model ? model.items.size : 1})));
  console.log(`=============================================================================`);
};

const createContextMapper = async (env, storage, composer, userid) => {
  try {
    const sharingTemplate = `https://$artifacts/Profile/Sharing.template`;
    const template = await env.loader.loadResource(sharingTemplate);
    const id = `${userid}-persist-context`;
    const key = `${storage}/${id}/handles`;
    const manifest = template.replace(/STORAGE_KEY/g, key);
    //console.log(manifest);
    //
    const context = await env.parse(contextContext);
    const host = new ArcHost(env, context, 'volatile://', composer);
    const arc = await host.spawn({id: `${userid}-mapper`, manifest});
    //
    reportShares(arc);
    arc.onDataChange(() => reportShares(arc), host);
    //
    return arc;
  } catch (x) {
    console.error(x);
  }
};
