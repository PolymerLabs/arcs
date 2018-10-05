
const log = console.log.bind(console);

class ArcsEnv {
  constructor(rootPath, loaderKind) {
    // remove trailing slash
    if (rootPath && rootPath[rootPath.length-1] === '/') {
      rootPath = rootPath.slice(0, -1);
    }
    this.rootPath = rootPath;
    this.loaderKind = loaderKind;
    this.pathMap = this.createPathMap(rootPath);
  }
  createPathMap(root) {
    return {
      'https://$cdn/': `${root}/`,
      'https://$shell/': `${root}/`,
      'https://$artifacts/': `${root}/artifacts/`
    };
  }
  // loader construction is lazy, so pathMap can be configured prior
  get loader() {
    return this._loader || (this._loader = new (this.loaderKind)(this.pathMap));
  }
  // pecFactory construction is lazy, so loader can be configured prior
  //get pecFactory() // abstract
  async parse(content, options) {
    const localOptions = {
      id: 'in-memory.manifest',
      fileName: './in-memory.manifest',
      loader: this.loader
    };
    if (options) {
      Object.assign(localOptions, options);
    }
    return ArcsEnv.Manifest.parse(content, localOptions);
  }
  extractRecipe(manifest) {
    const recipe = manifest.recipes[0];
    if (!recipe) {
      log(`couldn't find recipe`);
    } else {
      if (!recipe.normalize()) {
        log(`Couldn't normalize recipe ${recipe.toString()}`);
      } else {
        if (!recipe.isResolved()) {
          log(`Cannot instantiate an unresolved recipe: ${recipe.toString({showUnresolved: true})}`);
        } else {
          return recipe;
        }
      }
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
      return ArcsEnv.Arc.deserialize(params);
    } else {
      return new ArcsEnv.Arc(params);
    }
  }
}

export {ArcsEnv};
