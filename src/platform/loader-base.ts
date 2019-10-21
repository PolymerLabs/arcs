/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from './assert-web.js';
import {fetch} from './fetch-web.js';
import {JsonldToManifest} from '../runtime/converters/jsonldToManifest.js';
import {ParticleExecutionContext} from '../runtime/particle-execution-context.js';
import {ClientReference} from '../runtime/reference.js';
import {ParticleSpec} from '../runtime/particle-spec.js';
import {Particle} from '../runtime/particle.js';
import {DomParticle} from '../runtime/dom-particle.js';
import {TransformationDomParticle} from '../runtime/transformation-dom-particle.js';
import {MultiplexerDomParticle} from '../runtime/multiplexer-dom-particle.js';
import {UiParticle} from '../runtime/ui-particle.js';
import {UiMultiplexerParticle} from '../runtime/ui-multiplexer-particle.js';
import {html} from '../runtime/html.js';
import {logsFactory} from '../runtime/log-factory.js';

type Ctor = new() => Object;

interface UrlMap {
  [macro: string]: string | {
    root: string
    path?: string
    buildDir: string
    buildOutputRegex: RegExp
  };
}

const {warn} = logsFactory('Loader', 'green');

const isString = s => (typeof s === 'string');

export abstract class LoaderBase {
  public pec?: ParticleExecutionContext;
  protected readonly urlMap: UrlMap;
  constructor(urlMap?: {}) {
    this.urlMap = urlMap || {};
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
    path = path || '';
    // only unix slashes
    path = path.replace(/\\/g, '/');
    // remove './'
    path = path.replace(/\/\.\//g, '/');
    // remove 'foo/..'
    const norm = s => s.replace(/(?:^|\/)[^./]*\/\.\./g, '');
    // keep removing `<name>/..` until there are no more
    for (let n = norm(path); n !== path; path = n, n = norm(path));
    // remove '//' except after `:`
    path = path.replace(/([^:])(\/\/)/g, '$1/');
    return path;
  }
  resolve(path: string) {
    let resolved = this.resolvePath(path);
    resolved = this.normalizeDots(resolved);
    return resolved;
  }
  resolvePath(path: string) {
    let resolved: string = path;
    // TODO(sjmiles): inefficient
    // find longest key in urlMap that is a prefix of path
    const macro = this.findUrlMapMacro(path);
    if (macro) {
      const config = this.urlMap[macro];
      if (isString(config)) {
        resolved = `${config}${path.slice(macro.length)}`;
      } else {
        resolved = this.resolveConfiguredPath(path, macro, config);
      }
    }
    return resolved;
  }
  findUrlMapMacro(path: string): string {
    // TODO(sjmiles): inefficient
    // find longest key in urlMap that is a prefix of path
    return Object.keys(this.urlMap).sort((a, b) => b.length - a.length).find(k => isString(path) && (path.slice(0, k.length) === k));
  }
  resolveConfiguredPath(path: string, macro: string, config) {
    return [
      config.root,
      (path.match(config.buildOutputRegex) ? config.buildDir : ''),
      (config.path || ''),
      path.slice(macro.length)
    ].join('');
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
      this.urlMap[name] = folder;
    }
    this.urlMap['$here'] = folder;
    this.urlMap['$module'] = folder;
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
    let userClass = await this.requireParticle(spec.implFile || '', spec.implBlobUrl);
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
      private _impl: {};
      update(...args) {
        this.impl["update"](...args);
      }
      get impl() {
        if (!this._impl) {
          this._impl = new userClass();
          this._impl["output"] = (...args) => this.output(args);
          this._impl["particle"] = this;
        }
        return this._impl;
      }
    };
  }
  /**
   * Abstract
   *
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
