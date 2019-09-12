/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import './file-pane.js';
import './output-pane.js';
import '../configuration/whitelisted.js';
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

import '../../build/services/ml5-service.js';
import '../../build/services/random-service.js';

const files = document.getElementById('file-pane');
const output = document.getElementById('output-pane');
const popup = document.getElementById('popup');
init();

function init() {
  files.init(execute, document.getElementById('toggle-files'), document.getElementById('export-files'));
  document.getElementById('execute').addEventListener('click', execute);
  document.getElementById('help').addEventListener('click', showHelp);
  popup.addEventListener('click', () => popup.style.display = 'none');

  const params = new URLSearchParams(window.location.search);
  window.logLevel = (params.get('log') !== null) ? 1 : 0;

  const manifestParam = params.get('m') || params.get('manifest');
  if (manifestParam) {
    files.seedManifest(manifestParam.split(';').map(m => `import '${m}'`));
    execute();
  } else {
    const exampleManifest = `\
import 'https://$particles/Tutorial/Javascript/1_HelloWorld/HelloWorld.arcs'

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
  map DataStore as h0
  P
    data <- h0`;

    const exampleParticle = `\
defineParticle(({DomParticle, html, log}) => {
  return class extends DomParticle {
    get template() {
      log(\`Add '?log' to the URL to enable particle logging\`);
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

function execute() {
  wrappedExecute().catch(e => output.showError('Unhandled exception', e.stack));
}

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

  if (manifest.allRecipes.length == 0) {
    output.showError('No recipes found in Manifest.parse');
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
      containers: {
        toproot: arcPanel.arcToproot,
        root: arcPanel.arcRoot,
        modal: arcPanel.arcModal,
      }
    });
    const storage = new StorageProviderFactory(id);
    const arc = new Arc({
      id,
      context: manifest,
      pecFactories: [pecFactory],
      slotComposer,
      loader,
      storageProviderFactory: storage,
      inspectorFactory: devtoolsArcInspectorFactory
    });
    arcPanel.attachArc(arc);

    recipe.normalize();

    let resolvedRecipe = null;
    if (recipe.isResolved()) {
      resolvedRecipe = recipe;
    } else {
      const resolver = new RecipeResolver(arc);
      const options = {errors: new Map()};
      resolvedRecipe = await resolver.resolve(recipe, options);
      if (!resolvedRecipe) {
        arcPanel.showError('Error in RecipeResolver', `${
          [...options.errors.entries()].join('\n')
        }.\n${recipe.toString()}`);
        continue;
      }
    }

    try {
      await arc.instantiate(resolvedRecipe);
    } catch (e) {
      arcPanel.showError('Error in arc.instantiate', e);
      continue;
    }
    const description = await Runtime.getArcDescription(arc);
    await arcPanel.arcInstantiated(description);
  }
}

function showHelp() {
  popup.style.display = 'block';
  document.addEventListener('keydown', hideHelp);
}

function hideHelp(e) {
  popup.style.display = 'none';
  e.preventDefault();
  document.removeEventListener('keydown', hideHelp);
}
