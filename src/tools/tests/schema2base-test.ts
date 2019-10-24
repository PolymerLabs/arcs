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
import {Schema} from '../../runtime/schema.js';
import {Dictionary} from '../../runtime/hot.js';
import {Schema2Base, ClassGenerator} from '../schema2base.js';
import {SchemaNode} from '../schema2graph.js';

/* eslint key-spacing: ["error", {"mode": "minimum"}] */

class Schema2Mock extends Schema2Base {
  res: Dictionary<[string, string, boolean, string][]> = {};
  count: Dictionary<number> = {};

  constructor(manifest: Manifest) {
    super({'_': []});
    this.processManifest(manifest);
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    const mock = this;
    mock.res[node.name] = [];
    return {
      processField(field: string, typeChar: string, inherited: boolean, refName: string) {
        mock.res[node.name].push([field, typeChar, inherited, refName]);
      },

      generate(fieldCount: number): string {
        mock.count[node.name] = fieldCount;
        return '';
      }
    };
  }
}

describe('schema2base', () => {
  it('generates one class per unique schema', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        in * {Text txt} input1
        out Reference<* {Text txt, Number num}> input2
        inout [Site {URL url, Reference<* {Text txt}> ref}] input3
    `);
    const mock = new Schema2Mock(manifest);
    assert.sameMembers(Object.keys(mock.res), ['FooInternal1', 'Foo_Input2', 'Foo_Input3']);
  });

  it('supports all primitive types', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        in * {Text txt, URL url, Number num, Boolean flg} input
    `);
    const mock = new Schema2Mock(manifest);
    assert.deepStrictEqual(mock.res, {
      'Foo_Input': [
        ['txt', 'T', false, null],
        ['url', 'U', false, null],
        ['num', 'N', false, null],
        ['flg', 'B', false, null],
      ]
    });
    assert.deepStrictEqual(mock.count, {'Foo_Input': 4});
  });

  it('supports nested references with schema aliasing', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        in * {Text a, Reference<* {Text b}> r} h1
        in * {Reference<* {Boolean f, Reference<* {Number x}> t}> s} h2
    `);
    const mock = new Schema2Mock(manifest);
    assert.deepStrictEqual(mock.res, {
      'Foo_H1':     [['a', 'T', false, null], ['r', 'R', false, 'Foo_H1_R']],
      'Foo_H1_R':   [['b', 'T', false, null]],
      'Foo_H2':     [['s', 'R', false, 'Foo_H2_S']],
      'Foo_H2_S':   [['f', 'B', false, null], ['t', 'R', false, 'Foo_H2_S_T']],
      'Foo_H2_S_T': [['x', 'N', false, null]],
    });
    assert.deepStrictEqual(mock.count, {
      'Foo_H1': 2, 'Foo_H1_R': 1, 'Foo_H2': 1, 'Foo_H2_S': 2, 'Foo_H2_S_T': 1
    });
  });

  it('indicates inherited fields for type slicing', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        in * {Text txt} h1
        in * {Text txt, Number num} h2
        in * {URL url} h3
        in * {Text txt, Number num, URL url} h4
    `);
    const mock = new Schema2Mock(manifest);
    assert.deepStrictEqual(mock.res, {
      'Foo_H1': [['txt', 'T', false, null]],
      'Foo_H2': [['txt', 'T', true, null], ['num', 'N', false, null]],
      'Foo_H3': [['url', 'U', false, null]],
      'Foo_H4': [['txt', 'T', true, null], ['num', 'N', true, null], ['url', 'U', true, null]],
    });
    assert.deepStrictEqual(mock.count, {'Foo_H1': 1, 'Foo_H2': 2, 'Foo_H3': 1, 'Foo_H4': 3});
  });
});
