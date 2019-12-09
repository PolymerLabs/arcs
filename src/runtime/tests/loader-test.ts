/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {Particle} from '../particle.js';

describe('loader', () => {
  it('can extract a path', () => {
    assert.strictEqual(new Loader().path('a/foo'), 'a/');
  });
  it('can join paths', () => {
    assert.strictEqual(new Loader().join('a/foo', 'b'), 'a/b');
  });
  it('can join an absolute path', () => {
    const loader = new Loader();
    assert.strictEqual(loader.join('a/foo', 'http://b'), 'http://b');
    assert.strictEqual(loader.join('a/foo', 'https://b'), 'https://b');
  });
  it('can load a particle from a particle spec', async () => {
    const files: string[] = [];
    const testLoader = new class extends Loader {
      async requireParticle(fileName): Promise<typeof Particle> {
        files.push(fileName);
        return class extends Particle {};
      }
    }();
    const options = {
      fileName: 'somewhere/something',
      loader: testLoader,
    };
    const manifest = await Manifest.parse(`
        schema A
        schema B
        particle Foo in 'foo.js'
          a: reads A
          b: writes B`, options);
    const spec = manifest.findParticleByName('Foo');
    assert.strictEqual(spec.implFile, 'somewhere/foo.js');
    const clazz = await testLoader.loadParticleClass(spec);
    assert.strictEqual(clazz.spec, spec);
    assert.deepEqual(files, ['somewhere/foo.js']);
  });
});
