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
import {Schema2Cpp} from '../schema2cpp.js';
import {Schema2Kotlin} from '../schema2kotlin.js';

/* eslint key-spacing: ["error", {"mode": "minimum"}] */

class Schema2Mock extends Schema2Base {
  res: Dictionary<{count: number, adds: string[]}> = {};

  constructor(manifest: Manifest) {
    super({'_': []});
    this.processManifest(manifest);
  }

  getClassGenerator(node: SchemaNode): ClassGenerator {
    const collector = {count: 0, adds: []};
    this.res[node.name] = collector;
    return {
      addField(field: string, typeChar: string) {
        collector.adds.push(field + ':' + typeChar);
      },

      addReference(field: string, refName: string) {
        collector.adds.push(field + ':' + refName);
      },

      generate(fieldCount: number): string {
        collector.count = fieldCount;
        return '';
      }
    };
  }
}

describe('schema2wasm', () => {
  it('generates one class per unique schema', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        in * {Text txt} input1
        out Reference<* {Text txt, Number num}> input2
        inout [Site {URL url, Reference<* {Text txt}> ref}] input3
    `);
    const mock = new Schema2Mock(manifest);
    assert.deepStrictEqual(mock.res, {
      'FooInternal1': {count: 1, adds: ['txt:T']},
      'Foo_Input3':   {count: 2, adds: ['url:U', 'ref:FooInternal1']},
      'Foo_Input2':   {count: 2, adds: ['txt:T', 'num:N']},
    });
  });

  it('supports all primitive types', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        in * {Text txt, URL url, Number num, Boolean flg} input
    `);
    const mock = new Schema2Mock(manifest);
    assert.deepStrictEqual(mock.res, {
      'Foo_Input': {count: 4, adds: ['txt:T', 'url:U', 'num:N', 'flg:B']}
    });
  });

  it('supports nested references with schema aliasing', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        in * {Text a, Reference<* {Text b}> r} h1
        in * {Reference<* {Boolean f, Reference<* {Number x}> t}> s} h2
    `);
    const mock = new Schema2Mock(manifest);
    assert.deepStrictEqual(mock.res, {
      'Foo_H1':     {count: 2, adds: ['a:T', 'r:Foo_H1_R']},
      'Foo_H1_R':   {count: 1, adds: ['b:T']},
      'Foo_H2':     {count: 1, adds: ['s:Foo_H2_S']},
      'Foo_H2_S':   {count: 2, adds: ['f:B', 't:Foo_H2_S_T']},
      'Foo_H2_S_T': {count: 1, adds: ['x:N']},
    });
  });

  it('converts manifest file names to appropriate header file names (C++)', () => {
    const cpp = new Schema2Cpp({'_': []});
    assert.strictEqual(cpp.outputName('simple.arcs'), 'simple.h');
    assert.strictEqual(cpp.outputName('test-CPP.file_Name.arcs'), 'test-cpp-file-name.h');
  });

  it('converts manifest file names to appropriate source file names (Kotlin)', () => {
    const kotlin = new Schema2Kotlin({'_': []});
    assert.strictEqual(kotlin.outputName('simple.arcs'), 'Simple.kt');
    assert.strictEqual(kotlin.outputName('test-KOTLIN.file_Name.arcs'), 'TestKotlinFileName.kt');
  });
});
