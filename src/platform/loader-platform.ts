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
import {UiParticle} from '../runtime/ui-particle.js';
import {UiMultiplexerParticle} from '../runtime/ui-multiplexer-particle.js';

const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();

interface UrlMap {
  [macro: string]: string | {
    root: string
    path?: string
    buildDir: string
    buildOutputRegex: RegExp
  };
}

export class PlatformLoaderBase extends Loader {
  readonly _urlMap: UrlMap;

  constructor(urlMap: UrlMap) {
    super();
    this._urlMap = urlMap || {};
  }
  async loadResource(name: string): Promise<string> {
    const path = this.resolve(name);
    return super.loadResource(path);
  }
  resolve(path: string): string {
    let url: string = null;

    // TODO(sjmiles): inefficient!
    const macro = Object.keys(this._urlMap).sort((a, b) => b.length - a.length).find(k => path.slice(0, k.length) === k);
    if (macro) {
      const config = this._urlMap[macro];

      if (typeof config === 'string') {
        url = config + path.slice(macro.length);
      } else {
        url = config.root
            + (path.match(config.buildOutputRegex) ? config.buildDir : '')
            + (config.path || '')
            + path.slice(macro.length);
      }
    }
    url = this.normalizeDots(url || path);
    return url;
  }
  mapParticleUrl(path: string) {
    if (!path) {
      return undefined;
    }
    const resolved = this.resolve(path);
    const parts = resolved.split('/');
    const suffix = parts.pop();
    const folder = parts.join('/');
    if (!suffix.endsWith('.wasm')) {
      const name = suffix.split('.').shift();
      this._urlMap[name] = folder;
    }
    this._urlMap['$here'] = folder;
    this._urlMap['$module'] = folder;
  }
  unwrapParticle(particleWrapper, log?) {
    return particleWrapper({
      // Particle base
      Particle,
      // Dom-flavored Particles (deprecated?)
      DomParticle,
      MultiplexerDomParticle,
      TransformationDomParticle,
      // Ui-flavored Particles
      UiParticle,
      UiMultiplexerParticle,
      // Aliasing
      ReactiveParticle: UiParticle,
      SimpleParticle: UiParticle,
      // utilities
      resolver: this.resolve.bind(this), // allows particles to use relative paths and macros
      log: log || (() => {}),
      html
    });
  }
}
