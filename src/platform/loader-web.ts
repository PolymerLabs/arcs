/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlatformLoaderBase} from './loader-platform.js';
import {logsFactory} from '../runtime/log-factory.js';
import {ParticleSpec} from '../runtime/particle-spec.js';

const {log, warn, error} = logsFactory('loader-web', 'green');

export class PlatformLoader extends PlatformLoaderBase {
  flushCaches(): void {
    // punt object urls?
  }
  async loadResource(url: string): Promise<string> {
    // subclass impl differentiates paths and URLs,
    // for browser env we can feed both kinds into _loadURL
    return super._loadURL(this.resolve(url));
  }
  async provisionObjectUrl(fileName: string) {
    const raw = await this.loadResource(fileName);
    const path = this.resolve(fileName);
    const code = `${raw}\n//# sourceURL=${path}`;
    return URL.createObjectURL(new Blob([code], {type: 'application/javascript'}));
  }
  // Below here invoked from inside Worker
  async loadParticleClass(spec: ParticleSpec) {
    const clazz = await this.requireParticle(spec.implFile, spec.implBlobUrl);
    if (clazz) {
      clazz.spec = spec;
    } else {
      warn(`[${spec.implFile}]::defineParticle() returned no particle.`);
    }
    return clazz;
  }
  async requireParticle(unresolvedPath: string, blobUrl?) {
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
    self['defineParticle'] = (particleWrapper) => {
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
