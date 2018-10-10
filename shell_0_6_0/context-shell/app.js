import {Const} from '../configuration/constants.js';
import {SingleUserContext} from '../lib/single-user-context.js';
import {SyntheticStores} from '../lib/synthetic-stores.js';

//import {Xen} from '../lib/xen.js';
//Xen.Debug.level = 2;

export const App = async (env, composer) => {
  SyntheticStores.init(env);
  const userid = `gomer`;
  const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/${Const.version}`;
  const key = `${userid}-launcher`;
  const launcher = await SyntheticStores.getStore(storage, key);
  const arcsHandles = await launcher.toList();
  const arcsHandle = arcsHandles[0];
  if (arcsHandle) {
    const arcstore = await SyntheticStores.getHandleStore(arcsHandle);
    //const arcs = await arcstore.toList();
    //console.log(arcs);
    const context = await env.parse(``);
    const isProfile = true;
    const userContext = new SingleUserContext(storage, context, userid, arcstore, isProfile);
    setTimeout(() => {
      console.log(`\n`);
      console.log(`=============================================================================`);
      console.log(context.stores.map(({id, name}) => ({id, name})));
      //console.log(`=============================================================================`);
      //console.log(context.allStores.map(store => store.id));
      console.log(`=============================================================================`);
    }, 1000);
  }

  // const manifest = await env.parse(`import 'https://$artifacts/Arcs/Login.recipe'`);
  // console.log(`manifest [${manifest.id}]`);

  // const recipe = manifest.findRecipesByVerb('login')[0];
  // console.log(`recipe [${recipe.name}]`);

  // const arc = await env.spawn({id: 'smoke-arc', composer});
  // console.log(`arc [${arc.id}]`);

  // const plan = await env.resolve(recipe);
  // await arc.instantiate(plan);
  // console.log(`store [${arc._stores[0].id}]`);
  // console.log(`\n`);
  // console.log(`arc serialization`);
  // console.log(`=============================================================================`);
  // console.log(await arc.serialize());
  // console.log(`=============================================================================`);

  // return arc;
};
