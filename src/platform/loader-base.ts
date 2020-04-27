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
import {UiParticle} from '../runtime/ui-particle.js';
import {UiTransformationParticle} from '../runtime/ui-transformation-particle.js';
import {UiMultiplexerParticle} from '../runtime/ui-multiplexer-particle.js';
import {html} from '../runtime/html.js';
import {logsFactory} from '../platform/logs-factory.js';
import {Dictionary} from '../runtime/hot.js';
// The following imports just run the code in them on loading. These assign
// static functions into classes in order to break circular dependencies.
import '../runtime/schema-from-literal.js';
import '../runtime/type-from-literal.js';
import '../runtime/handle-constructors.js';
import '../runtime/storageNG/store-constructors.js';
import '../runtime/entity-utils.js';
import '../runtime/reference.js';
import '../runtime/interface-info-impl.js';

type ParticleCtor = typeof Particle;

type UrlMap = Dictionary<string | {
  root: string
  path?: string
  buildDir: string
  buildOutputRegex: string
  compiledRegex?: RegExp
}>;

const {warn} = logsFactory('Loader', 'green');

const isString = s => (typeof s === 'string');
const isSchemaOrgUrl = (s: string) => /\/\/schema.org\//.test(s);
// a qualified url is an absolute path with `https` protocol
const isQualifiedUrl = (s: string) =>/^https?:\/\//.test(s);

/**
 * Key public API:
 *   async loadResource(file: string): Promise<string>
 *   async loadBinaryResource(file: string): Promise<ArrayBuffer>
 *   async loadParticleClass(spec: ParticleSpec): Promise<typeof Particle>
 */
export abstract class LoaderBase {
  public pec?: ParticleExecutionContext;
  protected readonly urlMap: UrlMap;
  // TODO(sjmiles): fix needed in hotreload-integration-test to restore access specifiers
  /*protected readonly*/ staticMap: {};
  constructor(urlMap: UrlMap = {}, staticMap: {} = {}) {
    // ensure urlMap is valued if user passed in something nullish
    this.urlMap = urlMap || {};
    this.staticMap = staticMap;
    this.compileRegExp(this.urlMap);
  }
  abstract clone(): LoaderBase;
  setParticleExecutionContext(pec: ParticleExecutionContext): void {
    this.pec = pec;
  }
  flushCaches(): void {
    // as needed
  }
  // load[Resource|Static] and loadBinary[Resource|Static] methods are forked for type-safety (can we DRY?)
  async loadResource(file: string): Promise<string> {
    const content = this.loadStatic(file);
    if (content) {
      return content;
    }
    const path = this.resolve(file);
    if (isQualifiedUrl(path)) {
      return this.loadUrl(path);
    }
    return this.loadFile(path);
  }

  /**
   * Test to determine if string matches JVM package / class naming convention:
   * https://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html
   */
  isJvmClasspath(candidate: string): boolean {
    if (!candidate) return false;

    const isCapitalized = (s: string) => s[0] === s[0].toUpperCase();
    const startsWithLetter = (s: string) => /[a-zA-Z]/.test(s[0]);

    let capitalGate = false;
    for (const it of candidate.split('.')) {
      if (!it) return false;
      if (!/\w+/.test(it)) return false;
      if (!startsWithLetter(it)) return false;

      // Switch from lower to upper
      if (isCapitalized(it) && !capitalGate) {
        capitalGate = true;
      }

      // Reject invalid capitalization -- switch from upper to lower case
      if (!isCapitalized(it) && capitalGate) {
        return false
      }
    }

    // Should end with capitals
    return capitalGate;
  }
  jvmClassExists(classPath: string): boolean {
    return false;
  }
  async loadBinaryResource(file: string): Promise<ArrayBuffer> {
    const content = this.loadStaticBinary(file);
    if (content) {
      return content;
    }
    const path = this.resolve(file);
    if (isQualifiedUrl(path)) {
      return this.loadBinaryUrl(path);
    }
    return this.loadBinaryFile(path);
  }
  protected loadStatic(path: string): string {
    const content = this.staticMap[path] || this.staticMap['*'];
    if (content && !isString(content)) {
      throw new Error('Cannot load static binary content as string');
    }
    return content;
  }
  protected loadStaticBinary(path: string): ArrayBuffer {
    const content = this.staticMap[path];
    if (content) {
      if (content instanceof ArrayBuffer) {
        return content;
      }
      throw new Error('Cannot load static string content as binary');
    }
    return null;
  }
  protected async loadUrl(url: string): Promise<string> {
    if (isSchemaOrgUrl(url)) {
      return this.loadSchemaOrgUrl(url);
    }
    return this.fetchString(url);
  }
  protected async fetchString(url: string): Promise<string> {
    const res = await fetch(url);
    if (res.ok) {
      return res.text();
    }
    return Promise.reject(new Error(`HTTP ${res.status}: ${res.statusText}`));
  }
  protected async loadBinaryUrl(url: string): Promise<ArrayBuffer> {
    return this.fetchBuffer(url);
  }
  protected async fetchBuffer(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (res.ok) {
      return res.arrayBuffer();
    }
    return Promise.reject(new Error(`HTTP ${res.status}: ${res.statusText} for ${url}`));
  }
  /**
   * Abstract: platforms access the filesystem differently.
   */
  protected abstract async loadFile(url: string): Promise<string>;
  protected abstract async loadBinaryFile(url: string): Promise<ArrayBuffer>;
  //
  // TODO(sjmiles): public because it's used in manifest.ts, can we simplify?
  join(prefix: string, path: string): string {
    if (isQualifiedUrl(path)) {
      return path;
    }
    // TODO: replace this with something that isn't hacky
    if (path[0] === '/' || path[1] === ':') {
      return path;
    }
    prefix = prefix ? this.path(prefix) : '';
    path = this.normalizeDots(`${prefix}${path}`);
    return path;
  }
  // TODO(sjmiles): public because it's used in manifest.ts, can we simplify?
  path(fileName: string): string {
    return fileName.replace(/[/][^/]+$/, '/');
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
    const resolved = this.resolvePath(path);
    const compact = this.normalizeDots(resolved);
    return compact;
  }
  private resolvePath(path: string) {
    let resolved: string = path;
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
  private findUrlMapMacro(path: string): string {
    // find longest key in urlMap that is a prefix of path
    return Object.keys(this.urlMap)
        .sort((a, b) => b.length - a.length)
        .find(k => isString(path) && (path.slice(0, k.length) === k))
        ;
  }
  private resolveConfiguredPath(path: string, macro: string, config) {
    return [
      config.root,
      (path.match(config.compiledRegex) ? config.buildDir : ''),
      (config.path || ''),
      path.slice(macro.length)
    ].join('');
  }
  protected mapParticleUrl(path: string) {
    if (!path) {
      return undefined;
    }
    const resolved = this.resolve(path);
    const parts = resolved.split('/');
    parts.pop();
    const folder = parts.join('/');
    this.urlMap['$here'] = folder;
    this.urlMap['$module'] = folder;
  }
  private async loadSchemaOrgUrl(url: string): Promise<string> {
    let href = `${url}.jsonld`;
    let opts = null;
    if (url.endsWith('/Thing')) {
      href = 'https://schema.org/Product.jsonld';
      opts =  {'@id': 'schema:Thing'};
    }
    const data = await this.fetchString(href);
    return JsonldToManifest.convert(data, opts);
  }
  async provisionObjectUrl(fileName: string) {
    // no facility for this by default
    return null;
  }
  //
  // Below here invoked from inside isolation scope (e.g. Worker)
  //
  /**
   * Returns a particle class implementation by loading and executing
   * the code defined by a particle.  In the following example `x.js`
   * will be loaded and executed:
   *
   * ```
   * Particle foo in 'x.js'
   * ```
   */
  async loadParticleClass(spec: ParticleSpec): Promise<ParticleCtor> {
    let particleClass: ParticleCtor = null;
    const userClass = await this.requireParticle(spec.implFile || '', spec.implBlobUrl);
    if (!userClass) {
      warn(`[${spec.implFile}]::defineParticle() returned no particle.`);
    } else {
      particleClass = userClass;
      particleClass.spec = spec;
    }
    return particleClass;
  }
  /**
   * Loads a particle class from the given filename by loading the
   * script contained in `fileName` and executing it as a script.
   *
   * Protected for use in tests.
   *
   * Abstract because different platforms marshal particle execution contexts differently.
   */
  protected abstract async requireParticle(fileName: string, blobUrl?: string): Promise<ParticleCtor>;
  /**
   * executes the defineParticle() code and returns the results which should be a class definition.
   */
  protected unwrapParticle(particleWrapper, log?) {
    assert(this.pec);
    return particleWrapper({
      // Particle base
      Particle,
      // Ui-flavored Particles
      UiParticle,
      UiTransformationParticle,
      UiMultiplexerParticle,
      // Aliases
      SimpleParticle: UiParticle,
      // utilities
      Reference: ClientReference.newClientReference(this.pec),
      resolver: this.resolve.bind(this), // allows particles to use relative paths and macros
      log: log || (() => {}),
      html
    });
  }
  protected provisionLogger(fileName: string): Function {
    return logsFactory(fileName.split('/').pop(), '#1faa00').log;
  }
  private compileRegExp(urlMap: UrlMap) {
    for (const config of Object.values(urlMap)) {
      if (typeof config === 'string') continue;
      config.compiledRegex = RegExp(config.buildOutputRegex);
    }
  }
}
