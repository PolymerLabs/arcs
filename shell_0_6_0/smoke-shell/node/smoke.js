import {RamSlotComposer} from '../../../lib/ram-slot-composer.js';
import {ArcsEnvNode} from '../../../lib/node/arcs-env-node.js';
import {App} from '../app.js';

console.log('\n--- Arc Shell ---\n');

const env = new ArcsEnvNode('../../..');
env.pathMap[`https://$artifacts/`] = `../../../particles_0_6_0/`;

const composer = new RamSlotComposer();

(async () => {
  try {
    await App(env, composer);
  } catch (x) {
    console.error(x);
  }
})();
