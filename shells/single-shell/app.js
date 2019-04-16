import {Utils} from '../lib/runtime/utils.js';

export const App = async (composer, manifestPath) => {
  const context = await Utils.parse(`
import 'https://$particles/canonical.manifest'
import 'https://$particles/Profile/Sharing.recipe'
  `);
  console.log(`context [${context.id}]`);

  await installSystemUser({userid: 'gomer', context});
  console.log('installed SYSTEM_user');

  const manifest = await Utils.parse(`import 'https://$particles/${manifestPath || 'Arcs/Login.recipe'}'`);
  console.log(`manifest [${manifest.id}]`);

  const recipe = manifest.allRecipes[0];
  console.log(`recipe [${recipe.name}]`);

  const arc = await Utils.spawn({id: 'smoke-arc', composer, context});
  console.log(`arc [${arc.id}]`);

  const plan = await Utils.resolve(arc, recipe);
  await arc.instantiate(plan);

  console.log(`store [${arc._stores[0].id}]`);
  console.log('serialization:', await arc.serialize());

  return arc;
};

async function installSystemUser({userid, context}) {
  const store = await context.findStoreById('SYSTEM_user');
  if (store) {
    const user = {
      id: store.generateID(),
      rawData: {
        id: userid,
      }
    };
    store.set(user);
  }
}
