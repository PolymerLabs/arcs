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
import '../lib/platform/loglevel-web.js';

import {Runtime} from '../../build/runtime/runtime.js';
import {RamDiskStorageDriverProvider} from '../../build/runtime/storageNG/drivers/ramdisk.js';
import {SimpleVolatileMemoryProvider} from '../../build/runtime/storageNG/drivers/volatile.js';
import {Loader} from '../../build/platform/loader.js';
import {Arc} from '../../build/runtime/arc.js';
import {IdGenerator} from '../../build/runtime/id.js';
import {pecIndustry} from '../../build/platform/pec-industry-web.js';
import {RecipeResolver} from '../../build/runtime/recipe/recipe-resolver.js';
import {devtoolsArcInspectorFactory} from '../../build/devtools-connector/devtools-arc-inspector.js';
import {SlotComposer} from '../../build/runtime/slot-composer.js';
import {SlotObserver} from '../lib/xen-renderer.js';
import {RuntimeCacheService} from '../../build/runtime/runtime-cache.js';
import {VolatileStorage} from '../../build/runtime/storage/volatile-storage.js';

import '../../build/services/ml5-service.js';
import '../../build/services/random-service.js';

const root = '../..';
const urlMap = Runtime.mapFromRootPath(root);

// import DOM node references
const {
  filePane,
  outputPane,
  popupContainer,
  executeButton,
  toggleFilesButton,
  exportFilesButton,
  helpButton
} = window;

let memoryProvider;
init();

function init() {
  VolatileStorage.setStorageCache(new RuntimeCacheService());
  const memoryProvider = new SimpleVolatileMemoryProvider();
  RamDiskStorageDriverProvider.register(memoryProvider);
  filePane.init(execute, toggleFilesButton, exportFilesButton);
  executeButton.addEventListener('click', execute);
  helpButton.addEventListener('click', showHelp);
  popupContainer.addEventListener('click', () => popupContainer.style.display = 'none');

  const params = new URLSearchParams(window.location.search);
  window.logLevel = (params.get('log') !== null) ? 1 : 0;

  const manifestParam = params.get('m') || params.get('manifest');
  if (manifestParam) {
    filePane.seedManifest(manifestParam.split(';').map(m => `import '${m}'`));
    execute();
  } else {
    const exampleManifest = `\
import 'https://$particles/Tutorial/Javascript/1_HelloWorld/HelloWorld.arcs'

schema Data
  num: Number
  txt: Text

resource DataResource
  start
  [{"num": 73, "txt": "xyz"}]

store DataStore of Data in DataResource

particle P in 'a.js'
  root: consumes Slot
  data: reads Data

recipe
  h0: map DataStore
  P
    data: reads h0`;

    const exampleParticle = `
defineParticle(({SimpleParticle, html, log}) => {
  return class extends SimpleParticle {
    get template() {
      log(\`Add '?log' to the URL to enable particle logging\`);
      return html\`<span>{{num}}</span> : <span>{{str}}</span>\`;
    }
    render({data}) {
      return data ? {num: data.num, str: data.txt} : {};
    }
  };
});`;

    filePane.seedExample(exampleManifest, exampleParticle);
  }
}

function execute() {
  wrappedExecute().catch(e => outputPane.showError('Unhandled exception', e.stack));
}

async function wrappedExecute() {
  document.dispatchEvent(new Event('clear-arcs-explorer'));
  outputPane.reset();

  const loader = new Loader(urlMap, filePane.getFileMap());
  // TODO(sjmiles): should be a static method
  loader.flushCaches();

  const pecFactory = pecIndustry(loader);

  let manifest;
  try {
    const options = {loader, fileName: './manifest', throwImportErrors: true, memoryProvider};
    manifest = await Runtime.parseManifest(filePane.getManifest(), options);
  } catch (e) {
    outputPane.showError('Error in Manifest.parse', e);
    return;
  }

  if (manifest.allRecipes.length == 0) {
    outputPane.showError('No recipes found in Manifest.parse');
  }

  let arcIndex = 1;
  for (const recipe of manifest.allRecipes) {
    const id = IdGenerator.newSession().newArcId('arc' + arcIndex++);
    const arcPanel = outputPane.addArcPanel(id);

    const errors = new Map();
    if (!recipe.normalize({errors})) {
      arcPanel.showError('Error in recipe.normalize', [...errors.values()].join('\n'));
      continue;
    }

    const slotComposer = new SlotComposer();
    slotComposer.observeSlots(new SlotObserver(arcPanel.shadowRoot));

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
  popupContainer.style.display = 'block';
  document.addEventListener('keydown', hideHelp);
}

function hideHelp(e) {
  popupContainer.style.display = 'none';
  e.preventDefault();
  document.removeEventListener('keydown', hideHelp);
}
