/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Schema2Kotlin} from '../schema2kotlin.js';
import {Manifest} from '../../runtime/manifest.js';

describe('schema2kotlin', () => {
  it('creates unique aliases for schemas with multiple names', async () => {
    const manifest = await Manifest.parse(`\
  particle Foo
    in Product Element Thing {Text value} alpha
    in Thing {Number n} beta
    `);

    const mock = new Schema2Kotlin({'_': []});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.notInclude(generated, ';');
    assert.sameMembers(generated.split(/\n+/g), [
      'typealias ProductFoo_alpha = Foo_alpha',
      'typealias ElementFoo_alpha = Foo_alpha',
      'typealias ThingFoo_alpha = Foo_alpha',
      'typealias ThingFoo_beta = Foo_beta',
    ]);
  });

  it('creates scoped aliases for global schemas', async () => {
    const manifest = await Manifest.parse(`\
schema Product
  Text name
  Number sku

resource ProductResource
  start
  [{"name": "Vegemite", "sku": 249126}]
store ProductStore of Product in ProductResource

// Particle name must match the C++ class name
// Wasm module name must match one specified in wasm.json
particle BasicParticle in 'module.wasm'
  consume root
  in Product foo
  out [Product] bar

particle Watcher in 'https://$arcs/bazel-bin/particles/Native/Wasm/module.wasm'
  consume root
  in [Product] bar`);

    const mock = new Schema2Kotlin({'_': []});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.notInclude(generated, ';');
    assert.sameMembers(generated.split(/\n+/g), [
      'typealias ProductBasicParticle_foo = BasicParticle_foo',
      'typealias ProductBasicParticle_bar = BasicParticle_bar',
      'typealias ProductWatcher_bar = Watcher_bar',
    ]);
  });
});
