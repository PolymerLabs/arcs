/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {fs} from '../../platform/fs-web.js';
import {serialize2proto} from '../manifest2proto.js';

describe('manifest2proto', () => {
  it('encodes the example manifest', async () => {
    assert.deepStrictEqual(
      await serialize2proto('src/tools/tests/test-data/Example.arcs'),
      fs.readFileSync('src/tools/tests/test-data/example.pb.bin')
    );
  });
});
