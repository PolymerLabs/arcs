/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../../build/runtime/manifest.js';
import {Arc} from '../../build/runtime/arc.js';
import {IdGenerator} from '../../build/runtime/id.js';
import {RecipeResolver} from '../../build/runtime/recipe/recipe-resolver.js';
import {PlatformLoader} from '../../build/platform/loader-web.js';
import {PecIndustry} from '../../build/platform/pec-industry-web.js';
import {devtoolsArcInspectorFactory} from '../../build/devtools-connector/devtools-arc-inspector.js';

const log = console.log.bind(console);
const warn = console.warn.bind(console);
const env = {};

const createPathMap = root => ({
  'https://$arcs/': `${root}/`,
  'https://$shells/': `${root}/shells/`,
  'https://$build/': `${root}/shells/lib/build/`,
  'https://$particles/': {
    root,
    path: '/particles/',
    buildDir: '/bazel-bin',
    buildOutputRegex: /\.wasm$/,
  }
});

const init = (root, urls) => {
  const map = Object.assign(Utils.createPathMap(root), urls);
  env.loader = new PlatformLoader(map);
  env.pecFactory = PecIndustry(env.loader);
  return env;
};

const parse = async (content, options) => {
  const id = `in-memory-${Math.floor((Math.random()+1)*1e6)}.manifest`;
  const localOptions = {
    id,
    fileName: `./${id}`,
    loader: env.loader
  };
  if (options) {
    Object.assign(localOptions, options);
  }
  return Manifest.parse(content, localOptions);
};

const resolve = async (arc, recipe) =>{
  if (normalize(recipe)) {
    let plan = recipe;
    if (!plan.isResolved()) {
      const resolver = new RecipeResolver(arc);
      //const errors = new Map();
      plan = await resolver.resolve(recipe); //, {errors});
      //console.warn(errors);
      //if (plan) {
      //  normalize(plan);
      //}
      if (!plan || !plan.isResolved()) {
        warn('failed to resolve:\n', (plan || recipe).toString({showUnresolved: true}));
        //log(arc.context, arc, arc.context.storeTags);
        plan = null;
      }
    }
    return plan;
  }
};

const normalize = async (recipe) =>{
  const errors = new Map();
  if (isNormalized(recipe) || recipe.normalize({errors})) {
    return true;
  }
  warn('failed to normalize:\n', errors, recipe.toString());
  //warn('failed to normalize:\n', recipe.toString());
  return false;
};

const isNormalized = recipe => {
  return Object.isFrozen(recipe);
};

const spawn = async ({id, serialization, context, composer, storage, portFactories}) => {
  const arcId = IdGenerator.newSession().newArcId(id);
  const params = {
    id: arcId,
    fileName: './serialized.manifest',
    serialization,
    context,
    storageKey: storage || 'volatile',
    slotComposer: composer,
    pecFactories: [].concat([env.pecFactory], portFactories || []),
    loader: env.loader,
    inspectorFactory: devtoolsArcInspectorFactory,
  };
  Object.assign(params, env.params);
  return serialization ? Arc.deserialize(params) : new Arc(params);
};

export const Utils = {
  createPathMap,
  init,
  env,
  parse,
  resolve,
  spawn
};
