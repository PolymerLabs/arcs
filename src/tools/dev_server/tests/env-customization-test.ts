/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {requestPathRewriter} from '../env-customization';
import {assert} from '../../../platform/chai-web.js';

describe('ALDS request path rewriting', () => {
  it('does not affect .arcs, .js or .json files', async () => {
    assert.equal(requestPathRewriter('/a/b/c/Feature.arcs'), '/a/b/c/Feature.arcs');
    assert.equal(requestPathRewriter('/data.json'), '/data.json');
    assert.equal(requestPathRewriter('/feature/Particle.js'), '/feature/Particle.js');
  });
  it('serves wasm modules from bazel-bin', async () => {
    assert.equal(requestPathRewriter('/a/b/c/Particle.wasm'), '/bazel-bin/a/b/c/Particle.wasm');
  });
  it('does not prepend bazel-bin if already present', async () => {
    assert.equal(requestPathRewriter('/bazel-bin/a/b/c/Particle.wasm'), '/bazel-bin/a/b/c/Particle.wasm');
  });
});
