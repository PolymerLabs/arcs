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
      'typealias Foo_Product = Foo_alpha',
      'typealias Foo_Element = Foo_alpha',
    ]);
  });

  it('creates aliases while eliminating ambiguous identifiers', async () => {
    const manifest = await Manifest.parse(`\
particle Reader
  in * {Text value} object
  in Product Element Thing {Text value} myThing
  in Thing {Number n} otherThing`);

    const mock = new Schema2Kotlin({'_': []});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.notInclude(generated, ';');
    assert.sameMembers(generated.split(/\n+/g), [
      'typealias Reader_Product = Reader_myThing',
      'typealias Reader_Element = Reader_myThing',
    ]);
  });

  it('creates aliases while eliminating ambiguous identifies, including in the first connection', async () => {
    const manifest = await Manifest.parse(`\
particle Foo
  in Product Element Thing {Text value} myThing
  in Thing {Number n} otherThing
  out Product {Text name, Number age} anotherThing`);

    const mock = new Schema2Kotlin({'_': []});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.notInclude(generated, ';');
    assert.equal(generated, 'typealias Foo_Element = Foo_myThing');
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
      // 'typealias BasicParticle_foo = BasicParticle_Product',
      // 'typealias BasicParticle_bar = BasicParticle_Product',
      'typealias Watcher_Product = Watcher_bar',
    ]);
  });

  it('creates nested package name for entities', async () => {
    const manifest = await Manifest.parse(`\
    particle Reader
      in * {Text value} object
      out Id {Number hash} output`);

    const mock = new Schema2Kotlin({'_': [], 'package': 'grandma.mom.daughter'});
    const _ = mock.processManifest(manifest);
    const header = mock.fileHeader('');

    assert.equal(header.split(/\n+/g)[0], `package grandma.mom.daughter`);
  });

  it('creates a default package name when needed', async () => {

    const manifest = await Manifest.parse(`\
    particle Foo
      in * {Text name} input
      out Id {Number hash} output`);

    const mock = new Schema2Kotlin({'_': []});
    const _ = mock.processManifest(manifest);
    const header = mock.fileHeader('');

    assert.equal(header.split(/\n+/g)[0], `package arcs`);
  });
});
