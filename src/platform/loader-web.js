/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Loader} from '../runtime/loader.js';
import {Particle} from '../runtime/particle.js';
import {DomParticle} from '../runtime/dom-particle.js';
import {MultiplexerDomParticle} from '../runtime/multiplexer-dom-particle.js';
import {TransformationDomParticle} from '../runtime/transformation-dom-particle.js';
import {logFactory} from '../platform/log-web.js';

const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();

const dumbCache = {};

export class PlatformLoader extends Loader {
  constructor(urlMap) {
    super();
    this._urlMap = urlMap || [];
  }
  _loadURL(url) {
    const resolved = this._resolve(url);
    const cacheKey = this.normalizeDots(url);
    const resource = dumbCache[cacheKey];
    return resource || (dumbCache[cacheKey] = super._loadURL(resolved));
  }
  loadResource(name) {
    // subclass impl differentiates paths and URLs,
    // for browser env we can feed both kinds into _loadURL
    return this._loadURL(name);
  }
  _resolve(path) {
    let url = this._urlMap[path];
    if (!url && path) {
      // TODO(sjmiles): inefficient!
      const macro = Object.keys(this._urlMap).sort((a, b) => b.length - a.length).find(k => path.slice(0, k.length) == k);
      if (macro) {
        url = this._urlMap[macro] + path.slice(macro.length);
      }
    }
    url = url || path;
    //console.log(`loader-web: resolve(${path}) = ${url}`);
    return url;
  }
  // Below here invoked from inside Worker
  async requireParticle(fileName) {
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke "importScripts(resolver('foo/othermodule.js'))"
    this.mapParticleUrl(fileName);
    // load wrapped particle
    const result = [];
    self.defineParticle = function(particleWrapper) {
      result.push(particleWrapper);
    };
    // determine URL to load fileName
    const url = await this._resolve(fileName);
    importScripts(url);
    // clean up
    delete self.defineParticle;
    // execute particle wrapper
    return this.unwrapParticle(result[0], this.provisionLogger(fileName));
  }
  mapParticleUrl(fileName) {
    const path = this._resolve(fileName);
    const parts = path.split('/');
    const suffix = parts.pop();
    const folder = parts.join('/');
    const name = suffix.split('.').shift();
    this._urlMap[name] = folder;
  }
    provisionLogger(fileName) {
    return logFactory(fileName.split('/').pop(), '#1faa00');
  }
  unwrapParticle(particleWrapper, log) {
    const resolver = this._resolve.bind(this);
    return particleWrapper({
      Particle,
      DomParticle,
      MultiplexerDomParticle,
      SimpleParticle: DomParticle,
      TransformationDomParticle,
      resolver,
      log,
      html
    });
  }
}
