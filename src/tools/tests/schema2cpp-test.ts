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
import {Schema2Cpp} from '../schema2cpp.js';
import {Manifest} from '../../runtime/manifest.js';

describe('schema2cpp', () => {
  it('creates unique aliases for schemas with multiple names', async () => {
    const manifest = await Manifest.parse(`\
  particle Foo
    in Product Element Thing {Text value} alpha
    in Thing {Number n} beta
    `);

    const mock = new Schema2Cpp({'_': []});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.sameMembers(generated.split(/\n+/g), [
      'namespace arcs {',
      'using Foo_Product = Foo_alpha;',
      'using Foo_Element = Foo_alpha;',
      '}  // namespace arcs',
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

    const mock = new Schema2Cpp({'_': []});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.sameMembers(generated.split(/\n+/g), [
      'namespace arcs {',
      'using Watcher_Product = Watcher_bar;',
      '}  // namespace arcs'
    ]);
  });

  it('sets the nested namespace for entities', async () => {
    const manifest = await Manifest.parse(`\
schema Product
  Text name
  Number sku
  
particle BasicParticle in 'module.wasm'
  consume root
  in Product foo
  out [Product] bar`);

    const mock = new Schema2Cpp({'_': [], 'package': 'grandma.mom.daughter'});
    const [_, __, schemas] = mock.processManifest(manifest);

    const entities: string[] = Object.entries(schemas).map(([name, schema]) => mock.entityClass(name, schema));

    for (const entity of entities) {
      assert.include(entity,
`namespace grandma {
namespace mom {
namespace daughter {`);

      assert.include(entity,
`}  // namespace daughter
}  // namespace mom
}  // namespace grandma`);
    }
  });

  it('sets the nested namespace for aliases', async () => {
    const manifest = await Manifest.parse(`\
schema Product
  Text name
  Number sku
  
particle BasicParticle in 'module.wasm'
  consume root
  in Product foo
  out [Product] bar`);

    const mock = new Schema2Cpp({'_': [], 'package': 'grandma.mom.daughter'});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.sameMembers(generated.split(/\n+/g), [
      'namespace grandma {',
      'namespace mom {',
      'namespace daughter {',
      '}  // namespace daughter',
      '}  // namespace mom',
      '}  // namespace grandma',
    ]);
  });
  it('sets the default namespace for entities', async () => {
    const manifest = await Manifest.parse(`\
schema Product
  Text name
  Number sku
  
particle BasicParticle in 'module.wasm'
  consume root
  in Product foo
  out [Product] bar`);

    const mock = new Schema2Cpp({'_': []});
    const [_, __, schemas] = mock.processManifest(manifest);

    const entities: string[] = Object.entries(schemas).map(([name, schema]) => mock.entityClass(name, schema));

    for (const entity of entities) {
      assert.include(entity, `namespace arcs {`);
      assert.include(entity, `}  // namespace arcs`);
    }
  });

  it('sets the default namespace for aliases', async () => {
    const manifest = await Manifest.parse(`\
schema Product
  Text name
  Number sku
  
particle BasicParticle in 'module.wasm'
  consume root
  in Product foo
  out [Product] bar`);

    const mock = new Schema2Cpp({'_': []});
    const [aliases, ..._] = mock.processManifest(manifest);
    const generated = mock.addAliases(aliases);

    assert.sameMembers(generated.split(/\n+/g), [
      'namespace arcs {',
      '}  // namespace arcs',
    ]);
  });
});
