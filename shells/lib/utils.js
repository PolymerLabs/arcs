import {Manifest} from './arcs.js';
import {Arc} from './arcs.js';
import {RecipeResolver} from './arcs.js';
import {Env} from './arcs.js';

const log = console.log.bind(console);
const warn = console.warn.bind(console);

const parse = async (content, options) => {
  const localOptions = {
    id: 'in-memory.manifest',
    fileName: './in-memory.manifest',
    loader: Env.loader
  };
  if (options) {
    Object.assign(localOptions, options);
  }
  return Manifest.parse(content, localOptions);
};

const resolve = async (arc, recipe) =>{
  if (recipe.normalize()) {
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
    pecFactory: Env.pecFactory,
    loader: Env.loader
  };
  Object.assign(params, Env.params);
  if (serialization) {
    return Arc.deserialize(params);
  } else {
    return new Arc(params);
  }
};

export const Utils = {
  parse,
  resolve,
  spawn
};
