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
import {Aliases, Schema2Base} from '../schema2base.js';
import {Schema} from '../../runtime/schema.js';
import {Manifest} from '../../runtime/manifest.js';


class Schema2Mock extends Schema2Base {
  public readonly entityArgs: [string, Schema][] = [];
  public readonly outnameArgs: string[] = [];
  public readonly basenameArgs: string[] = [];
  public readonly namespaceArgs: string[] = [];

  entityClass(name: string, schema: Schema): string {
    this.entityArgs.push([name, schema]);
    return '';
  }

  fileFooter(): string {
    return '';
  }

  fileHeader(outName: string): string {
    this.outnameArgs.push(outName);
    return '';
  }

  outputName(baseName: string): string {
    this.basenameArgs.push(baseName);
    return baseName;
  }

  addAliases(aliases: Aliases): string {
    return '';
  }

  addScope(namespace: string) {
    this.namespaceArgs.push(namespace);
  }

}

describe('schema2base', () => {
  it('creates names for anonymous schemas (0 names)', async () => {
    const manifest = await Manifest.parse(`\
  particle Foo
    in * {Number n} input0
    in * {Number n} input1
    in * {Number x} input2
    in * {(URL or Text) u} union
    in * {(Number, Number) coordinate} tuple 
    in Reference<* {Number n, URL u}> nested0
    in Reference<* {Number n}> nested1
    in [* {Text t, URL u}] collection0
    in [* {URL u, Text t}] collection1
    in [* {Text t}] collection2
    `);

    const mock = new Schema2Mock({'_': []});
    const [_, ...schemas] = mock.processManifest(manifest);

    const names = schemas.map(s => Object.keys(s)).reduce((acc, x) => acc.concat(x), []);
    assert.equal(names.length, 10);
    assert.includeDeepOrderedMembers(names,
      ['Foo_input0', 'Foo_input1', 'Foo_input2', 'Foo_union', 'Foo_tuple', 'Foo_nested0', 'Foo_nested1',
        'Foo_collection0', 'Foo_collection1', 'Foo_collection2']);
  });

  it('sets the scope / package once', async () => {

    const manifest = await Manifest.parse(`\
  particle Bar
    in Product {Text name, Number price} order
    out [Product {Text name, Number price}] recommendations
    `);

    const mock = new Schema2Mock({'_': [], 'package': 'baz'});
    const _ = mock.processManifest(manifest);

    assert.includeDeepOrderedMembers(mock.namespaceArgs, ['baz']);

  });
});
