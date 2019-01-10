import {Env} from '../arcs.js';
import {Runtime} from '../../../build/runtime/runtime.js';

export class EnvBase {
  constructor(rootPath, loaderKind) {
    if (rootPath && rootPath[rootPath.length-1] === '/') {
      // remove trailing slash
      rootPath = rootPath.slice(0, -1);
    }
    this.rootPath = rootPath;
    this.loaderKind = loaderKind;
    this.pathMap = this.createPathMap(rootPath);
    this._loader = new (this.loaderKind)(this.pathMap);
    // TODO. Temporary until ArcRunner carries this info.
    Runtime.setLoader(this._loader);
    // publish instance methods into shared import object
    Object.defineProperties(Env, {
      loader: {
        get: () => this.loader
      },
      pecFactory: {
        get: () => this.pecFactory
      }
    });
  }
  createPathMap(root) {
    return {
      'https://$cdn/': `${root}/`,
      'https://$shell/': `${root}/shells/`, // deprecated
      'https://$shells/': `${root}/shells/`,
      'https://$particles/': `${root}/particles/`,
      'https://$artifacts/': `${root}/particles/`, // deprecated
    };
  }
  get loader() {
    return this._loader;
  }
  // pecFactory construction is lazy, so loader can be configured prior
  //get pecFactory() // abstract
}
