/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Loader} from '../../../runtime/ts-build/loader.js';
import {Particle} from '../../../runtime/particle.js';
import {DomParticle} from '../../../runtime/dom-particle.js';
import {MultiplexerDomParticle} from '../../../runtime/multiplexer-dom-particle.js';
import {TransformationDomParticle} from '../../../runtime/transformation-dom-particle.js';

const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();

const dumbCache = {};

export class NodeLoader extends Loader {
  constructor(urlMap) {
    super();
    this._urlMap = urlMap;
  }
  loadResource(name) {
    const path = this._resolve(name);
    const cacheKey = path; //new URL(url, document.URL).href;
    const resource = dumbCache[cacheKey];
    return resource || (dumbCache[cacheKey] = super.loadResource(path));
  }
  _resolve(path) {
    //return new URL(path, this._base).href;
    let url = this._urlMap[path];
    if (!url && path) {
      // TODO(sjmiles): inefficient!
      const macro = Object.keys(this._urlMap).sort((a, b) => b.length - a.length).find(k => path.slice(0, k.length) == k);
      if (macro) {
        url = this._urlMap[macro] + path.slice(macro.length);
      }
    }
    url = url || path;
    //console.log(`browser-loader: resolve(${path}) = ${url}`);
    return url;
  }
  requireParticle(fileName) {
    const path = this._resolve(fileName);
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke `importScripts(resolver('foo/othermodule.js'))`
    this.mapParticleUrl(path);
    return super.requireParticle(path);
  }
  mapParticleUrl(path) {
    const parts = path.split('/');
    const suffix = parts.pop();
    const folder = parts.join('/');
    const name = suffix.split('.').shift();
    this._urlMap[name] = folder;
  }
  unwrapParticle(particleWrapper, log) {
    // TODO(sjmiles): regarding `resolver`:
    //  _resolve method allows particles to request remapping of assets paths
    //  for use in DOM
    const resolver = this._resolve.bind(this);
    // TODO(sjmiles): hack to plumb `fetch` into Particle space under node
    //const _fetch = NodeLoader.fetch || fetch;
    return particleWrapper({
      Particle,
      DomParticle,
      MultiplexerDomParticle,
      SimpleParticle: DomParticle,
      TransformationDomParticle,
      resolver,
      log: log || (() => {}),
      html,
      //_fetch
    });
  }
}
