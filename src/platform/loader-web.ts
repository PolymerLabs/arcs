/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from './logs-factory.js';
import {LoaderBase} from './loader-base.js';

const {warn} = logsFactory('loader-web', 'green');

export class Loader extends LoaderBase {
  clone(): Loader {
    return new Loader(this.urlMap);
  }
  flushCaches(): void {
    // punt object urls?
  }
  async loadResource(url: string): Promise<string> {
    // subclass impl differentiates paths and URLs,
    // for browser env we can feed both kinds into _loadURL
    const path = this.resolve(url);
    return this.loadStatic(path) || this.loadURL(path);
  }
  async provisionObjectUrl(fileName: string) {
    if (fileName.endsWith('.wasm')) {
      return null;
    } else {
      const raw = await this.loadResource(fileName);
      const path = this.resolve(fileName);
      const code = `${raw}\n//# sourceURL=${path}`;
      return URL.createObjectURL(new Blob([code], {type: 'application/javascript'}));
    }
  }
  // TODO(sjmiles): integrate this into loadResource?
  async loadWasmBinary(spec): Promise<ArrayBuffer> {
    this.mapParticleUrl(spec.implFile);
    // TODO(sjmiles): BLOB Urls don't seem to work for .wasm (?)
    const target = /*spec.implBlobUrl ||*/ this.resolve(spec.implFile);
    return fetch(target).then(res => res.arrayBuffer());
  }
  async requireParticle(unresolvedPath: string, blobUrl: string) {
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke "importScripts(resolver('foo/othermodule.js'))"
    this.mapParticleUrl(unresolvedPath);
    // resolve path
    const resolvedPath = this.resolve(unresolvedPath);
    // resolved target
    const url = blobUrl || resolvedPath;
    // load wrapped particle
    const wrapper = this.loadWrappedParticle(url, resolvedPath);
    // unwrap particle wrapper, if we have one
    if (wrapper) {
      const logger = this.provisionLogger(unresolvedPath);
      return this.unwrapParticle(wrapper, logger);
    }
  }
  loadWrappedParticle(url: string, path?: string) {
    let result;
    // MUST be synchronous from here until deletion
    // of self.defineParticle because we share this
    // scope with other particles
    // TODO fix usage of quoted property
    self['defineParticle'] = particleWrapper => {
      if (result) {
        warn('multiple particles not supported, last particle wins');
      }
      // multiple particles not supported: last particle wins
      result = particleWrapper;
    };
    try {
      // import (execute) particle code
      importScripts(url);
    } catch (e) {
      e.message = `Error loading Particle from '${path}': ${e.message}`;
      throw e;
    } finally {
      // clean up
      delete self['defineParticle'];
    }
    return result;
  }
  provisionLogger(fileName: string) {
    return logsFactory(fileName.split('/').pop(), '#1faa00').log;
  }
}
