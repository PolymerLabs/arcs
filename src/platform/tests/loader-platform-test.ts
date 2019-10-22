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
import {PlatformLoaderBase} from '../loader-platform.js';

describe('PlatformLoader', () => {
  it('can substitute macros', async () => {
    const loader = new PlatformLoaderBase({
      'https://$macro/': 'http://host:1234/here/',
      'https://$other/': '../../../',
    });

    assert.equal(loader.resolve('https://$macro/Particle.js'),
        'http://host:1234/here/Particle.js');
    assert.equal(loader.resolve('https://$other/Feature.arcs'),
        '../../../Feature.arcs');
  });
  it('can fetch wasm modules from build directory', async () => {
    const loader = new PlatformLoaderBase({
      'https://$macro/': {
        root: 'http://host/',
        buildDir: 'bazel-bin/',
        buildOutputRegex: /\.wasm$/,
      }
    });

    assert.equal(loader.resolve('https://$macro/over/here/Particle.wasm'),
        'http://host/bazel-bin/over/here/Particle.wasm');
    assert.equal(loader.resolve('https://$macro/over/here/Feature.arcs'),
        'http://host/over/here/Feature.arcs');
  });
  it('can fetch wasm modules from build directory with internal path', async () => {
    const loader = new PlatformLoaderBase({
      'https://$macro/': {
        root: '../../',
        path: 'over/here/',
        buildDir: 'bazel-bin/',
        buildOutputRegex: /\.wasm$/,
      }
    });

    assert.equal(loader.resolve('https://$macro/Particle.wasm'),
        '../../bazel-bin/over/here/Particle.wasm');
    assert.equal(loader.resolve('https://$macro/Feature.arcs'),
        '../../over/here/Feature.arcs');
  });
});
