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
import {Dictionary} from '../../runtime/hot.js';
import {Schema2Base, EntityGenerator} from '../schema2base.js';
import {SchemaNode} from '../schema2graph.js';
import {Schema2Cpp} from '../schema2cpp.js';
import {Schema2Kotlin} from '../schema2kotlin.js';
import {ParticleSpec} from '../../runtime/particle-spec.js';
import {generateFields} from '../kotlin-schema-field.js';

/* eslint key-spacing: ["error", {"mode": "minimum"}] */

class Schema2Mock extends Schema2Base {
  res: Dictionary<string[]> = {};

  static async create(manifest: Manifest): Promise<Schema2Mock> {
    const mock = new Schema2Mock({'_': []});
    await mock.processManifest(manifest);
    return mock;
  }

  getEntityGenerator(node: SchemaNode): EntityGenerator {
    this.res[node.entityClassName] = generateFields(node).map(f => `${f.name}:${f.type.kotlinType}`);

    return {
      generate() {
        return '';
      }
    };
  }

  async generateParticleClass(particle: ParticleSpec) {
    return '';
  }

  async generateTestHarness(particle: ParticleSpec, nodes: SchemaNode[]): Promise<string> {
    return '';
  }
}

describe('schema2wasm', () => {
  it('generates one class per unique schema', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        input1: reads * {txt: Text}
        input2: writes &* {txt: Text, num: Number}
        input3: reads writes [Site {url: URL, ref: &* {txt: Text}}]
    `);
    const mock = await Schema2Mock.create(manifest);
    assert.deepStrictEqual(mock.res, {
      'FooInternal1': ['txt:String'],
      'Site':         ['url:String', 'ref:Reference<FooInternal1>?'],
      'Foo_Input2':   ['txt:String', 'num:Double'],
    });
  });

  it('supports all primitive types', async () => {
    // TODO: test optional schema fields when supported
    const manifest = await Manifest.parse(`\
      particle Foo
        input: reads * {txt: Text, url: URL, num: Number, flg: Boolean}
    `);
    const mock = await Schema2Mock.create(manifest);
    assert.deepStrictEqual(mock.res, {
      'Foo_Input': ['txt:String', 'url:String', 'num:Double', 'flg:Boolean']
    });
  });

  it('supports nested references with schema aliasing', async () => {
    const manifest = await Manifest.parse(`\
      particle Foo
        h1: reads * {a: Text, r: &* {b: Text}}
        h2: reads * {s: &* {f: Boolean, t: &* {x: Number}}}
    `);
    const mock = await Schema2Mock.create(manifest);
    assert.deepStrictEqual(mock.res, {
      'Foo_H1':     ['a:String', 'r:Reference<Foo_H1_R>?'],
      'Foo_H1_R':   ['b:String'],
      'Foo_H2':     ['s:Reference<Foo_H2_S>?'],
      'Foo_H2_S':   ['f:Boolean', 't:Reference<Foo_H2_S_T>?'],
      'Foo_H2_S_T': ['x:Double'],
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
