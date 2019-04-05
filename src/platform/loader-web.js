/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
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

const log = logFactory('loader-web', 'green');
const warn = logFactory('loader-web', 'green', 'warn');
const error = logFactory('loader-web', 'green', 'error');

const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();

// mono-state data (module scope)
let simpleCache = {};

export class PlatformLoader extends Loader {
  constructor(urlMap) {
    super();
    this._urlMap = urlMap || [];
  }
  flushCaches() {
    simpleCache = {};
  }
  _loadURL(url) {
    const resolved = this._resolve(url);
    const cacheKey = this.normalizeDots(url);
    const resource = simpleCache[cacheKey];
    return resource || (simpleCache[cacheKey] = super._loadURL(resolved));
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
    //log(`resolve(${path}) = ${url}`);
    return url;
  }
  // Below here invoked from inside Worker
  async requireParticle(fileName) {
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke "importScripts(resolver('foo/othermodule.js'))"
    this.mapParticleUrl(fileName);
    // determine URL to load fileName
    const url = this._resolve(fileName);
    // load wrapped particle
    const particle = this.loadWrappedParticle(url);
    // execute particle wrapper, if we have one
    if (particle) {
      return this.unwrapParticle(particle, this.provisionLogger(fileName));
    }
  }
  loadWrappedParticle(url) {
    let result;
    // MUST be synchronous from here until deletion
    // of self.defineParticle because we share this
    // scope with other particles
    self.defineParticle = function(particleWrapper) {
      if (result) {
        warn('multiple particles not supported, last particle wins');
      }
      // multiple particles not supported: last particle wins
      result = particleWrapper;
    };
    try {
    // import (execute) particle code
      importScripts(url);
    } catch (x) {
      error(x);
    }
    // clean up
    delete self.defineParticle;
    return result;
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
  mapParticleUrl(fileName) {
    const path = this._resolve(fileName);
    const parts = path.split('/');
    const suffix = parts.pop();
    const folder = parts.join('/');
    const name = suffix.split('.').shift();
    this.mapUrl(name, folder);
  }
  mapUrl(prefix, url) {
    this._urlMap[prefix] = url;
  }
  provisionLogger(fileName) {
    return logFactory(fileName.split('/').pop(), '#1faa00');
  }
}
