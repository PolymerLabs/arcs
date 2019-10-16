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
//import {vm} from '../platform/vm-web.js';
//import {fs} from '../platform/fs-web.js';
//
import {JsonldToManifest} from './converters/jsonldToManifest.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {ClientReference} from './reference.js';
import {ParticleSpec} from './particle-spec.js';
import {Particle} from './particle.js';
//
import {DomParticle} from './dom-particle.js';
import {TransformationDomParticle} from './transformation-dom-particle.js';
import {MultiplexerDomParticle} from './multiplexer-dom-particle.js';
//
import {UiParticle} from './ui-particle.js';
import {UiMultiplexerParticle} from './ui-multiplexer-particle.js';
//
import {html} from './html.js';
import {logsFactory} from './log-factory.js';

const {warn} = logsFactory('Loader', 'green');

export abstract class Loader {
  protected _urlMap: [];
  public pec?: ParticleExecutionContext;
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
  // async loadResource(file: string): Promise<string> {
  //   if (/^https?:\/\//.test(file)) {
  //     return this._loadURL(file);
  //   }
  //   return this.loadFile(file, 'utf-8') as Promise<string>;
  // }
  // async loadWasmBinary(spec): Promise<ArrayBuffer> {
  //   // TODO: use spec.implBlobUrl if present?
  //   this.mapParticleUrl(spec.implFile);
  //   const target = this.resolve(spec.implFile);
  //   if (/^https?:\/\//.test(target)) {
  //     return fetch(target).then(res => res.arrayBuffer());
  //   } else {
  //     return this.loadFile(target) as Promise<ArrayBuffer>;
  //   }
  // }
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

  // private async loadFile(file: string, encoding?: string): Promise<string | ArrayBuffer> {
  //   return new Promise((resolve, reject) => {
  //     fs.readFile(file, {encoding}, (err, data: string | Buffer) => {
  //       if (err) {
  //         reject(err);
  //       } else {
  //         resolve(encoding ? (data as string) : (data as Buffer).buffer);
  //       }
  //     });
  //   });
  // }

  async _loadURL(url: string): Promise<string> {
    if (/\/\/schema.org\//.test(url)) {
      return this._loadSchemaOrgUrl(url);
    }
    return this._fetchText(url);
  }
  async _loadSchemaOrgUrl(url: string): Promise<string> {
    let href = `${url}.jsonld`;
    let opts = null;
    if (url.endsWith('/Thing')) {
      href = 'https://schema.org/Product.jsonld';
      opts =  {'@id': 'schema:Thing'};
    }
    const data = await this._fetchText(href);
    return JsonldToManifest.convert(data, opts);
  }
  async _fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (res.ok) {
      return res.text()
    }
    return Promise.reject(new Error(`HTTP ${res.status}: ${res.statusText}`));
  }

  /**
   * Returns a particle class implementation by loading and executing
   * the code defined by a particle.  In the following example `x.js`
   * will be loaded and executed:
   *
   * ```
   * Particle foo in 'x.js'
   * ```
   */
  // async loadParticleClass(spec: ParticleSpec): Promise<typeof Particle> {
  //   const clazz = await this.requireParticle(spec.implFile);
  //   clazz.spec = spec;
  //   return clazz;
  // }
  async loadParticleClass(spec: ParticleSpec) {
    const clazz = await this.requireParticle(spec.implFile, spec.implBlobUrl);
    if (clazz) {
      clazz.spec = spec;
    } else {
      warn(`[${spec.implFile}]::defineParticle() returned no particle.`);
    }
    return clazz;
  }
  /**
   * Loads a particle class from the given filename by loading the
   * script contained in `fileName` and executing it as a script.
   *
   * Protected for use in tests.
   */
  // protected async requireParticle(fileName: string): Promise<typeof Particle> {
  //   fileName = fileName || '';
  //   const src = await this.loadResource(fileName);
  //   // Note. This is not real isolation.
  //   const script = new vm.Script(src, {filename: fileName, displayErrors: true});
  //   const result = [];
  //   // TODO(lindner): restrict Math.random here.
  //   const self = {
  //     defineParticle(particleWrapper) {
  //       result.push(particleWrapper);
  //     },
  //     console,
  //     fetch,
  //     setTimeout,
  //     importScripts: s => null //console.log(`(skipping browser-space import for [${s}])`)
  //   };
  //   script.runInNewContext(self, {filename: fileName, displayErrors: true});
  //   assert(result.length > 0 && typeof result[0] === 'function', `Error while instantiating particle implementation from ${fileName}`);
  //   return this.unwrapParticle(result[0]);
  // }
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
  // unwrapParticle(particleWrapper): typeof Particle {
  //   assert(this.pec);
  //   return particleWrapper({
  //     Particle,
  //     DomParticle,
  //     SimpleParticle: UiParticle,
  //     TransformationDomParticle,
  //     MultiplexerDomParticle,
  //     Reference: ClientReference.newClientReference(this.pec),
  //     html
  //   });
  // }
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
      // Aliasing
      ReactiveParticle: UiParticle,
      SimpleParticle: UiParticle,
      // utilities
      Reference: ClientReference.newClientReference(this.pec),
      resolver: this.resolve.bind(this), // allows particles to use relative paths and macros
      log: log || (() => {}),
      html
    });
  }
  // clone(): Loader {
  //   return (new (Object.getPrototypeOf(this).constructor)(this._urlMap)) as Loader;
  // }
}
