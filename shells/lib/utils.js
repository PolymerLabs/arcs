import {Manifest} from '../../build/runtime/manifest.js';
import {Arc} from '../../build/runtime/arc.js';
import {RecipeResolver} from '../../build/runtime/recipe/recipe-resolver.js';
import {PlatformLoader} from '../../build/platform/loader-web.js';
import {PecIndustry} from '../../build/platform/pec-industry-web.js';
import {debugListeners} from './debug-listeners.js';

const log = console.log.bind(console);
const warn = console.warn.bind(console);
const env = {};

const createPathMap = root => ({
  'https://$arcs/': `${root}/`,
  'https://$shells/': `${root}/shells/`,
  'https://$build/': `${root}/shells/lib/build/`,
  'https://$particles/': `${root}/particles/`,
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
  if (!recipe.normalize()) {
    warn('failed to normalize:\n', recipe.toString());
  } else {
    let plan = recipe;
    if (!plan.isResolved()) {
      const resolver = new RecipeResolver(arc);
      plan = await resolver.resolve(recipe);
      if (!plan || !plan.isResolved()) {
        warn('failed to resolve:\n', (plan || recipe).toString({showUnresolved: true}));
        log(arc.context, arc, arc.context.storeTags);
        plan = null;
      }
    }
    return plan;
  }
};

const spawn = async ({id, serialization, context, composer, storage}) => {
  const params = {
    id,
    fileName: './serialized.manifest',
    serialization,
    context,
    storageKey: storage,
    slotComposer: composer,
    pecFactory: env.pecFactory,
    loader: env.loader,
    listenerClasses: debugListeners
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
