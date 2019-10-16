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
    const generated = [...mock.processManifest(manifest)];

    assert.lengthOf(generated, 2);
    assert.match(generated[0], /typealias\s+[\w_]*Product[\w_]*\s*=\s*/g);
    assert.match(generated[0], /typealias\s+[\w_]*Element[\w_]*\s*=\s*/g);
    assert.match(generated[0], /typealias\s+[\w_]*Thing[\w_]*\s*=\s*/g);
    assert.match(generated[1], /typealias\s+[\w_]*Thing[\w_]*\s*=\s*/g);
  });
});
