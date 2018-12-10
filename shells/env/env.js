import {RecipeResolver} from './arcs.js';
import {Manifest} from './arcs.js';
import {Arc} from './arcs.js';

const log = console.log.bind(console);
const warn = console.warn.bind(console);

class ArcsEnv {
  constructor(rootPath, loaderKind) {
    if (rootPath && rootPath[rootPath.length-1] === '/') {
      // remove trailing slash
      rootPath = rootPath.slice(0, -1);
    }
    this.rootPath = rootPath;
    this.loaderKind = loaderKind;
    this.pathMap = this.createPathMap(rootPath);
  }
  createPathMap(root) {
    return {
      'https://$cdn/': `${root}/`,
      'https://$shell/': `${root}/shell/`,
      'https://$particles/': `${root}/particles/`,
      'https://$artifacts/': `${root}/particles/`, // deprecated
    };
  }
  // pecFactory construction is lazy, so loader can be configured prior
  //get pecFactory() // abstract
  // loader construction is lazy, so pathMap can be configured prior
  get loader() {
    return this._loader || (this._loader = new (this.loaderKind)(this.pathMap));
  }
  async parse(content, options) {
    const localOptions = {
      id: 'in-memory.manifest',
      fileName: './in-memory.manifest',
      loader: this.loader
    };
    if (options) {
      Object.assign(localOptions, options);
    }
    return Manifest.parse(content, localOptions);
  }
  async resolve(arc, recipe) {
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
  }
  async spawn({id, serialization, context, composer, storage}) {
    const params = {
      id,
      fileName: './serialized.manifest',
      serialization,
      context,
      storageKey: storage,
      slotComposer: composer,
      pecFactory: this.pecFactory,
      loader: this.loader
    };
    Object.assign(params, this.params);
    if (serialization) {
      return Arc.deserialize(params);
    } else {
      return new Arc(params);
    }
  }
}

export {ArcsEnv};
