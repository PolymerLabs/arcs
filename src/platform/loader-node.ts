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
  async loadFile(path: string): Promise<string> {
    const data = await this.loadFileData(path, 'utf-8');
    if (typeof data !== 'string') {
      throw new Error(`loadFileData returned type [${typeof data}] instead of non-String for utf-8 file [${path}]`);
    }
    return data;
  }
  async loadBinaryFile(path: string): Promise<ArrayBuffer> {
    const data = await this.loadFileData(path);
    if (!(data instanceof Buffer)) {
      throw new Error(`loadFileData returned non-Buffer for binary file [${path}]`);
    }
    // convert Buffer to ArrayBuffer (slice in case a small Buffer is a view on a shared ArrayBuffer)
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  private async loadFileData(path: string, encoding?: string): Promise<string | Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(path, encoding, (err, data: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  async requireParticle(fileName: string, blobUrl?: string): Promise<typeof Particle> {
    // inject path to this particle into the UrlMap,
    // allows Foo particle to invoke `importScripts(resolver('$here/othermodule.js'))`
    this.mapParticleUrl(fileName);
    // resolve path
    const path = this.resolve(fileName);
    // get source code
    const src = await this.loadResource(blobUrl || path);
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
    const wrapper = result[0];
    assert(typeof wrapper === 'function', `Error while instantiating particle implementation from ${fileName}`);
    // unwrap particle wrapper
    return this.unwrapParticle(wrapper, this.provisionLogger(fileName));
  }
}
