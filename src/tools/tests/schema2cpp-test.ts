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
import {Schema2Cpp} from '../schema2cpp.js';

describe('schema2cpp', () => {
  it('converts manifest file names to appropriate header file names', () => {
    const cpp = new Schema2Cpp({'_': []});
    assert.strictEqual(cpp.outputName('simple.arcs'), 'simple.h');
    assert.strictEqual(cpp.outputName('test-CPP.file_Name.arcs'), 'test-cpp-file-name.h');
  });

  // TODO: more tests
});
