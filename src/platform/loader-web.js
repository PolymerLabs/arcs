/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlatformLoaderBase} from './loader-platform.js';
import {logFactory} from '../platform/log-web.js';

const log = logFactory('loader-web', 'green');
const warn = logFactory('loader-web', 'green', 'warn');
const error = logFactory('loader-web', 'green', 'error');

export class PlatformLoader extends PlatformLoaderBase {
  flushCaches() {
    // punt object urls?
  }
  async loadResource(url) {
    // subclass impl differentiates paths and URLs,
    // for browser env we can feed both kinds into _loadURL
    return super._loadURL(this._resolve(url));
  }
  async loadBinary(url) {
    return super.loadBinary(this._resolve(url));
  }
  async provisionObjectUrl(fileName) {
    const raw = await this.loadResource(fileName);
    const code = `${raw}\n//# sourceURL=${fileName}`;
    return URL.createObjectURL(new Blob([code], {type: 'application/javascript'}));
  }
  // Below here invoked from inside Worker
  async loadParticleClass(spec) {
    const clazz = await this.requireParticle(spec.implFile, spec.implBlobUrl);
    clazz.spec = spec;
    return clazz;
  }
  async requireParticle(unresolvedPath, blobUrl) {
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke "importScripts(resolver('foo/othermodule.js'))"
    this.mapParticleUrl(unresolvedPath);
    // resolved target
    const url = blobUrl || this._resolve(unresolvedPath);
    // load wrapped particle
    const particle = this.loadWrappedParticle(url);
    // execute particle wrapper, if we have one
    if (particle) {
      const logger = this.provisionLogger(unresolvedPath);
      return this.unwrapParticle(particle, logger);
    }
  }
  provisionLogger(fileName) {
    return logFactory(fileName.split('/').pop(), '#1faa00');
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
}
