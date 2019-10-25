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
import {Manifest} from '../../runtime/manifest.js';
import {Schema2Kotlin} from '../schema2kotlin.js';

describe('schema2kotlin', () => {
  it('converts manifest file names to appropriate source file names', () => {
    const kotlin = new Schema2Kotlin({'_': []});
    assert.strictEqual(kotlin.outputName('simple.arcs'), 'Simple.kt');
    assert.strictEqual(kotlin.outputName('test-KOTLIN.file_Name.arcs'), 'TestKotlinFileName.kt');
  });

  // TODO: more tests
});
