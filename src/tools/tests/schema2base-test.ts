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
import {Schema2Base, TypeGraph, EntityData} from '../schema2base.js';
import {Dictionary} from '../../runtime/hot.js';
import {Schema} from '../../runtime/schema.js';


class Schema2Mock extends Schema2Base {
  entityClass(data: EntityData): string {
    return '';
  }

  fileFooter(): string {
    return '';
  }

  fileHeader(outName: string): string {
    return '';
  }

  outputName(baseName: string): string {
    return '';
  }

}

describe('schema2base', () => {
  describe('buildTypeGraph', () => {
  it('builds a simple graph', async () => {
    const m = await Manifest.parse(`
    particle Accessor
        in Coordinate {Number x, Number y} input1
        out XPosition {Number x} output1`);
    const entries = Schema2Base.collectFieldEntries(m);
    return Schema2Base.buildTypeGraph(entries);
  });
 });
});
