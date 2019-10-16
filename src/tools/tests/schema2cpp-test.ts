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
    const generated = [...mock.processManifest(manifest)];

    assert.lengthOf(generated, 2);
    assert.include(generated[0], 'using FooProduct_alpha = Foo_alpha;');
    assert.include(generated[0], 'using FooElement_alpha = Foo_alpha;');
    assert.include(generated[0], 'using FooThing_alpha = Foo_alpha;');
    assert.include(generated[1], 'using FooThing_beta = Foo_beta;');
  });
});
