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
import {Manifest} from '../../runtime/manifest.js';
import {Schema2Base} from '../schema2base.js';
import {Dictionary} from '../../runtime/hot.js';
import {Schema} from '../../runtime/schema.js';

describe('schema2base', () => {
  const testManifest = <T> (apply: (m: Manifest) => T) => async (manifest: string, expected: T) => {
    const man = await Manifest.parse(manifest);
    const actual: T = apply(man);
    assert.deepEqual(actual, expected);
  };
 describe('collectSchemas', () => {
   const testCollectSchemas = testManifest(Schema2Base.collectSchemas);
  it('', () => {});
 });
});
