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

import {Arc} from '../../build/runtime/arc.js';
import {Runtime} from '../../build/runtime/runtime.js';
import {RecipeResolver} from '../../build/runtime/recipe-resolver.js';
import {devtoolsArcInspectorFactory} from '../../build/devtools-connector/devtools-arc-inspector.js';
import {SlotObserver} from '../lib/xen-renderer.js';

// how to reach arcs root from our URL/CWD
const root = '../..';

// extra params for created arcs
const extraArcParams = {
  inspectorFactory: devtoolsArcInspectorFactory
};

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

init();

function init() {
  // prepare ui
  filePane.init(execute, toggleFilesButton, exportFilesButton);
  executeButton.addEventListener('click', execute);
  helpButton.addEventListener('click', showHelp);
  popupContainer.addEventListener('click', () => popupContainer.style.display = 'none');
  // scan window parameters
  const params = new URLSearchParams(window.location.search);
  // set logLevel
  window.logLevel = (params.get('log') !== null) ? 1 : 0;
  // seed manifest as requested
  const manifestParam = params.get('m') || params.get('manifest');
  if (manifestParam) {
    filePane.seedManifest(manifestParam.split(';').map(m => `import '${m}'`));
    execute();
  } else {
    const exampleManifest = `\
import 'https://$particles/Tutorial/Javascript/1_HelloWorld/HelloWorld.arcs'

store DataStore of Data {num: Number, txt: Text} with {
  {num: 73, txt: 'abc'}
}

particle P in 'a.js'
  root: consumes Slot
  data: reads Data {num: Number, txt: Text}

recipe
  h0: copy DataStore
  P
    data: reads h0`;
    const exampleParticle = `\
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
  wrappedExecute().catch(e => {
    outputPane.showError('Unhandled exception', e.stack);
    console.error(e);
  });
}

async function wrappedExecute() {
  // clear ui
  document.dispatchEvent(new Event('clear-arcs-explorer'));
  outputPane.reset();
  // establish a runtime using custom parameters
  const runtime = await createRuntime();
  // attempt to parse the context manifest
  try {
    runtime.context = await runtime.parse(filePane.getManifest(), {fileName: './manifest', throwImportErrors: true});
  } catch (e) {
    outputPane.showError('Error in Manifest.parse', e);
    return;
  }
  // check for existence of recipes
  if (runtime.context.allRecipes.length == 0) {
    outputPane.showError('No recipes found in Manifest.parse');
  }
  // instantiate an arc for each recipe in context
  let arcIndex = 1;
  for (const recipe of runtime.context.allRecipes) {
    executeArc(recipe, runtime, arcIndex++);
  }
}

async function createRuntime(context) {
  const runtime = Runtime.create({root, staticMap: filePane.getFileMap(), context});
  runtime.loader.flushCaches();
  return runtime;
}

async function executeArc(recipe, runtime, index) {
  // ask runtime to assemble arc parameter boilerplate (argument is the arc name)
  const params = runtime.buildArcParams(`arc${index}`);
  // establish a UI Surface
  const arcPanel = outputPane.addArcPanel(params.id);
  const error = err => arcPanel.showError(err);
  // attach a renderer (SlotObserver and a DOM node) to the composer
  params.slotComposer.observeSlots(new SlotObserver(arcPanel.shadowRoot));
  // construct the arc
  const arc = new Arc({...params, extraArcParams});
  // attach arc to bespoke shell ui
  arcPanel.attachArc(arc);
  arc.arcPanel = arcPanel;
  //
  try {
    // verify recipe is normalized
    const errors = new Map();
    if (!recipe.normalize({errors})) {
      throw (`Error in recipe.normalize: ${[...errors.values()].join('\n')}`);
    }
    await instantiateRecipe(arc, recipe);
  } catch (x) {
    arcPanel.showError(x);
    return;
  }

  // // attempt to resolve recipe
  // let resolvedRecipe = null;
  // if (recipe.isResolved()) {
  //   resolvedRecipe = recipe;
  // } else {
  //   const resolver = new RecipeResolver(arc);
  //   const options = {errors: new Map()};
  //   resolvedRecipe = await resolver.resolve(recipe, options);
  //   if (!resolvedRecipe) {
  //     arcPanel.showError('Error in RecipeResolver', `${
  //       [...options.errors.entries()].join('\n')
  //     }.\n${recipe.toString()}`);
  //     return;
  //   }
  // }
  // // instantiate recipe
  // try {
  //   await arc.instantiate(resolvedRecipe);
  // } catch (e) {
  //   arcPanel.showError('Error in arc.instantiate', e);
  //   return;
  // }
  // display description
  await arcPanel.arcInstantiated(await Runtime.getArcDescription(arc));
}

async function instantiateRecipe(arc, recipe) {
  // attempt to resolve recipe
  let resolvedRecipe = null;
  if (recipe.isResolved()) {
    resolvedRecipe = recipe;
  } else {
    const resolver = new RecipeResolver(arc);
    const options = {errors: new Map()};
    resolvedRecipe = await resolver.resolve(recipe, options);
    if (!resolvedRecipe) {
      throw `Error in RecipeResolver: ${[...options.errors.entries()].join('\n')}.\n${recipe.toString()}`;
    }
  }
  // instantiate recipe
  try {
    await arc.instantiate(resolvedRecipe);
  } catch (e) {
    throw `Error in arc.instantiate: ${e}`;
  }
}

async function resolveRecipe(arc, recipe) {
  if (!recipe.isResolved()) {
    const resolver = new RecipeResolver(arc);
    const errors = new Map();
    if (!await resolver.resolve(recipe, {errors})) {
      return errors;
    }
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
