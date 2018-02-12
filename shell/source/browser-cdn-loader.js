/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Loader from '../../../arcs/runtime/loader.js';
import particle from '../../../arcs/runtime/particle.js';
import DomParticle from '../../../arcs/runtime/dom-particle.js';
import TransformationDomParticle from '../../../arcs/runtime/transformation-dom-particle.js';

const logFactory = (preamble, color, log='log') => console[log].bind(console, `Ptcl:%c${preamble}`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 4px;`);
const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
const dumbCache = {};

export default class BrowserLoader extends Loader {
  constructor(urlMap) {
    super();
    this._urlMap = urlMap;
  }
  _loadURL(url) {
    const resource = dumbCache[url];
    if (resource) {
      //console.warn('dumbCache hit for', url);
    }
    return resource || (dumbCache[url] = super._loadURL(url));
  }
  _resolve(path) {
    //return new URL(path, this._base).href;
    let url = this._urlMap[path];
    if (!url && path) {
      // TODO(sjmiles): inefficient!
      let macro = Object.keys(this._urlMap).sort((a,b) => b.length - a.length).find(k => path.slice(0, k.length) == k);
      if (macro) {
        url = this._urlMap[macro] + path.slice(macro.length);
      }
    }
    url = url || path;
    //console.log(`browser-cdn-loader: resolve(${path}) = ${url}`);
    return url;
  }
  loadResource(name) {
    return this._loadURL(this._resolve(name));
  }
  requireParticle(fileName) {
    let path = this._resolve(fileName);
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke `importScripts(resolver('foo/othermodule.js'))`
    this.mapParticleUrl(path);
    let result = [];
    self.defineParticle = function(particleWrapper) {
      result.push(particleWrapper);
    };
    importScripts(path);
    delete self.defineParticle;
    return this.unwrapParticle(result[0], logFactory(fileName.split('/').pop(), 'blue'));
  }
  mapParticleUrl(path) {
    let parts = path.split('/');
    let suffix = parts.pop();
    let folder = parts.join('/');
    let name = suffix.split('.').shift();
    this._urlMap[name] = folder;
  }
  unwrapParticle(particleWrapper, log) {
    // TODO(sjmiles): regarding `resolver`:
    //  _resolve method allows particles to request remapping of assets paths
    //  for use in DOM
    let resolver = this._resolve.bind(this);
    return particleWrapper({particle, Particle: particle.Particle, DomParticle, TransformationDomParticle, resolver, log, html});
  }
}
