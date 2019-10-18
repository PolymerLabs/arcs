/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';
import {fetch} from '../platform/fetch-web.js';
import {JsonldToManifest} from './converters/jsonldToManifest.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {ClientReference} from './reference.js';
import {ParticleSpec} from './particle-spec.js';
import {Particle} from './particle.js';
import {DomParticle} from './dom-particle.js';
import {TransformationDomParticle} from './transformation-dom-particle.js';
import {MultiplexerDomParticle} from './multiplexer-dom-particle.js';
import {UiParticle} from './ui-particle.js';
import {UiMultiplexerParticle} from './ui-multiplexer-particle.js';
import {html} from './html.js';
import {logsFactory} from './log-factory.js';

type Ctor = new() => Object;

const {warn} = logsFactory('Loader', 'green');

export abstract class Loader {
  public pec?: ParticleExecutionContext;
  protected _urlMap: [];
  constructor(urlMap?: []) {
    this._urlMap = urlMap || [];
  }
  setParticleExecutionContext(pec: ParticleExecutionContext): void {
    this.pec = pec;
  }
  flushCaches(): void {
    // as needed
  }
  path(fileName: string): string {
    return fileName.replace(/[/][^/]+$/, '/');
  }
  join(prefix: string, path: string): string {
    if (/^https?:\/\//.test(path)) {
      return path;
    }
    // TODO: replace this with something that isn't hacky
    if (path[0] === '/' || path[1] === ':') {
      return path;
    }
    prefix = this.path(prefix);
    path = this.normalizeDots(`${prefix}${path}`);
    return path;
  }
  // convert `././foo/bar/../baz` to `./foo/baz`
  protected normalizeDots(path: string): string {
    // only unix slashes
    path = path.replace(/\\/g, '/');
    // remove './'
    path = path.replace(/\/\.\//g, '/');
    // remove 'foo/..'
    const norm = s => s.replace(/(?:^|\/)[^./]*\/\.\./g, '');
    for (let n = norm(path); n !== path; path = n, n = norm(path));
    // remove '//' except after `:`
    path = path.replace(/([^:])(\/\/)/g, '$1/');
    return path;
  }
  resolve(path: string) {
    let url = this._urlMap[path];
    if (!url && path) {
      // TODO(sjmiles): inefficient!
      const macro = Object.keys(this._urlMap).sort((a, b) => b.length - a.length).find(k => path.slice(0, k.length) === k);
      if (macro) {
        url = this._urlMap[macro] + path.slice(macro.length);
      }
    }
    url = this.normalizeDots(url || path);
    return url;
  }
  mapParticleUrl(path: string) {
    if (!path) {
      return undefined;
    }
    const parts = path.split('/');
    const suffix = parts.pop();
    const folder = parts.join('/');
    const resolved = this.resolve(folder);
    if (!suffix.endsWith('.wasm')) {
      const name = suffix.split('.').shift();
      this._urlMap[name] = resolved;
    }
    this._urlMap['$here'] = resolved;
    this._urlMap['$module'] = resolved;
  }
  async _loadURL(url: string): Promise<string> {
    if (/\/\/schema.org\//.test(url)) {
      return this.loadSchemaOrgUrl(url);
    }
    return this.fetchText(url);
  }
  private async loadSchemaOrgUrl(url: string): Promise<string> {
    let href = `${url}.jsonld`;
    let opts = null;
    if (url.endsWith('/Thing')) {
      href = 'https://schema.org/Product.jsonld';
      opts =  {'@id': 'schema:Thing'};
    }
    const data = await this.fetchText(href);
    return JsonldToManifest.convert(data, opts);
  }
  protected async fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (res.ok) {
      return res.text()
    }
    return Promise.reject(new Error(`HTTP ${res.status}: ${res.statusText}`));
  }

  // Below here invoked from inside isolation scope (e.g. Worker)

  /**
   * Returns a particle class implementation by loading and executing
   * the code defined by a particle.  In the following example `x.js`
   * will be loaded and executed:
   *
   * ```
   * Particle foo in 'x.js'
   * ```
   */
  async loadParticleClass(spec: ParticleSpec): Promise<typeof Particle> {
    let clazz: any = null;
    let userClass = await this.requireParticle(spec.implFile, spec.implBlobUrl);
    if (!userClass) {
      warn(`[${spec.implFile}]::defineParticle() returned no particle.`);
    } else {
      // TODO(sjmiles): this seems bad, but instanceof didn't work (worker scope?)
      if (userClass.toString().includes('extends')) {
      //if (userClass instanceof Particle) {
        clazz = userClass;
      } else {
        clazz = this.implementWrappedParticle(userClass);
      }
      clazz.spec = spec;
    }
    return clazz;
  }
  private implementWrappedParticle(userClass): Ctor {
    return class extends UiParticle {
      update(...args) {
        console.warn('UPDATE UDPATE UDTAPE');
        this.impl.update(...args);
      }
      get impl() {
        if (!this._impl) {
          this._impl = new userClass();
          this._impl.particle = this;
        }
        return this._impl;
      }
    };
  }
  /**
   * Loads a particle class from the given filename by loading the
   * script contained in `fileName` and executing it as a script.
   *
   * Protected for use in tests.
   */
  protected abstract async requireParticle(fileName: string, blobUrl?: string): Promise<typeof Particle>;
  /**
   * executes the defineParticle() code and returns the results which should be a class definition.
   */
  unwrapParticle(particleWrapper, log?) {
    assert(this.pec);
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
      // Aliases
      ReactiveParticle: UiParticle,
      SimpleParticle: UiParticle,
      // utilities
      Reference: ClientReference.newClientReference(this.pec),
      resolver: this.resolve.bind(this), // allows particles to use relative paths and macros
      log: log || (() => {}),
      html
    });
  }
}
