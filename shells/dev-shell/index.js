/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {FilePane} from './file-pane.js';
import {OutputPane} from './output-pane.js';
import {DevShellLoader} from './loader.js';

import {Runtime} from '../../build/runtime/runtime.js';
import {Arc} from '../../build/runtime/arc.js';
import {IdGenerator} from '../../build/runtime/id.js';
import {Modality} from '../../build/runtime/modality.js';
import {ModalityHandler} from '../../build/runtime/modality-handler.js';
import {PecIndustry} from '../../build/platform/pec-industry-web.js';
import {RecipeResolver} from '../../build/runtime/recipe/recipe-resolver.js';
import {SlotComposer} from '../../build/runtime/slot-composer.js';
import {SlotDomConsumer} from '../../build/runtime/slot-dom-consumer.js';
import {StorageProviderFactory} from '../../build/runtime/storage/storage-provider-factory.js';
import {devtoolsArcInspectorFactory} from '../../build/devtools-connector/devtools-arc-inspector.js';

const files = document.getElementById('file-pane');
const output = document.getElementById('output-pane');
const toggleFiles = document.getElementById('toggle-files');

async function wrappedExecute() {
  SlotDomConsumer.clearCache();  // prevent caching of template strings
  document.dispatchEvent(new Event('clear-arcs-explorer'));
  output.reset();

  const loader = new DevShellLoader(files.getFileMap());
  const pecFactory = PecIndustry(loader);

  let manifest;
  try {
    const options = {loader, fileName: './manifest', throwImportErrors: true};
    manifest = await Runtime.parseManifest(files.getManifest(), options);
  } catch (e) {
    output.showError('Error in Manifest.parse', e);
    return;
  }

  let arcIndex = 1;
  for (const recipe of manifest.allRecipes) {
    const id = IdGenerator.newSession().newArcId('arc' + arcIndex++);
    const arcPanel = output.addArcPanel(id);

    const errors = new Map();
    if (!recipe.normalize({errors})) {
      arcPanel.showError('Error in recipe.normalize', [...errors.values()].join('\n'));
      continue;
    }

    const slotComposer = new SlotComposer({
      modalityName: Modality.Name.Dom,
      modalityHandler: ModalityHandler.domHandler,
      rootContainer: arcPanel.arcRoot
    });
    const storage = new StorageProviderFactory(id);
    const arc = new Arc({
      id,
      context: manifest,
      pecFactory,
      slotComposer,
      loader,
      storageProviderFactory: storage,
      inspectorFactory: devtoolsArcInspectorFactory
    });
    arcPanel.attachArc(arc);

    const resolver = new RecipeResolver(arc);
    const resolvedRecipe = await resolver.resolve(recipe);
    if (!resolvedRecipe) {
      arcPanel.showError('Error in RecipeResolver');
      continue;
    }

    try {
      await arc.instantiate(resolvedRecipe);
    } catch (e) {
      arcPanel.showError('Error in arc.instantiate', e);
      continue;
    }
    arcPanel.display(await Runtime.getArcDescription(arc));
  }
}

function execute() {
  wrappedExecute().catch(e => output.showError('Unhandled exception', e.stack));
}

function init() {
  let manifest;
  const params = new URLSearchParams(window.location.search);
  const manifestParam = params.get('m') || params.get('manifest');
  if (manifestParam) {
    toggleFiles.click();
    files.seedManifest(manifestParam.split(';').map(m => `import '${m}'`));
  } else {
    const exampleManifest = `\
import 'https://$particles/Tutorial/1_HelloWorld/HelloWorld.recipe'

schema Data
  Number num
  Text txt

resource DataResource
  start
  [{"num": 73, "txt": "xyz"}]

store DataStore of Data in DataResource

particle P in 'a.js'
  consume root
  in Data data 

recipe
  use DataStore as h0
  P
    data <- h0`;

    const exampleParticle = `\
defineParticle(({DomParticle, html}) => {
  return class extends DomParticle {
    get template() {
      return html\`<span>{{num}}</span> : <span>{{str}}</span>\`;
    }
    render({data}) {
      return data ? {num: data.num, str: data.txt} : {};
    }
  };
});`;

    files.seedExample(exampleManifest, exampleParticle);
  }
}

document.getElementById('execute').addEventListener('click', execute);
document.getElementById('export').addEventListener('click', files.exportFiles.bind(files));
toggleFiles.addEventListener('click', files.toggleFiles.bind(files));
files.setExecuteCallback(execute);
init();
