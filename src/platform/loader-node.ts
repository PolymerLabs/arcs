/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from './assert-node.js';
import {fetch} from './fetch-node.js';
import {vm} from './vm-node.js';
import {fs} from './fs-node.js';
import {Particle} from '../runtime/particle.js';
import {LoaderBase} from './loader-base.js';

export class Loader extends LoaderBase {
  clone(): Loader {
    return new Loader(this.urlMap);
  }
  async loadResource(file: string): Promise<string> {
    const path = this.resolve(file);
    const content = this.loadStatic(path);
    if (content) {
      return content;
    }
    if (/^https?:\/\//.test(path)) {
      return this.loadURL(path);
    }
    return this.loadFile(path);
  }
  private async loadFile(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(file, 'utf-8', (err, data: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  protected async requireParticle(fileName: string, blobUrl?: string): Promise<typeof Particle> {
    const path = this.resolve(fileName);
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke `importScripts(resolver('foo/othermodule.js'))`
    this.mapParticleUrl(path);
    // get source code
    const src = await this.loadResource(blobUrl || fileName);
    // Note. This is not real isolation.
    const script = new vm.Script(src, {filename: fileName, displayErrors: true});
    const result = [];
    // TODO(lindner): restrict Math.random here.
    const self = {
      defineParticle(particleWrapper) {
        result.push(particleWrapper);
      },
      console,
      fetch,
      setTimeout,
      importScripts: s => null //console.log(`(skipping browser-space import for [${s}])`)
    };
    script.runInNewContext(self, {filename: fileName, displayErrors: true});
    assert(result.length > 0 && typeof result[0] === 'function', `Error while instantiating particle implementation from ${fileName}`);
    return this.unwrapParticle(result[0]);
  }
}
