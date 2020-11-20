/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Loader} from './loader.js';

export class Env {
  static loader: Loader;
  /**
   * Call `init` to establish a default loader environment.
   */
  static init(root?: string, urls?: {}) {
    this.loader = new Loader({...this.mapFromRootPath(root), ...urls});
  }
  static mapFromRootPath(root: string) {
    // TODO(sjmiles): the map below is commonly-used, but it's not generic enough to live here.
    // Shells that use this default should be provide it to `init` themselves.
    return {
      // important: path to `worker.js`
      'https://$worker/': `${root}/shells/lib/worker/dist/`,
      // TODO(sjmiles): for backward compat
      'https://$build/': `${root}/shells/lib/worker/dist/`,
      // these are optional (?)
      'https://$arcs/': `${root}/`,
      'https://$shells': `${root}/shells`,
      'https://$particles/': {
        root,
        path: '/particles/',
        buildDir: '/bazel-bin',
        buildOutputRegex: /\.wasm$/.source
      }
    };

  }
}
