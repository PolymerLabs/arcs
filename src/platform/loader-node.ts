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
import {Loader as LoaderBase} from '../runtime/loader-base.js';

export class Loader extends LoaderBase {
  clone(): Loader {
    return new Loader(this.urlMap);
  }
  async loadResource(file: string): Promise<string> {
    if (/^https?:\/\//.test(file)) {
      return this._loadURL(file);
    }
    return this.loadFile(file, 'utf-8') as Promise<string>;
  }
  private async loadFile(file: string, encoding?: string): Promise<string | ArrayBuffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(file, {encoding}, (err, data: string | Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(encoding ? (data as string) : (data as Buffer).buffer);
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
