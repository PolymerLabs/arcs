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
import {Manifest} from '../../runtime/manifest.js';
import {SchemaGraph} from '../schema2graph.js';
import {generateFields} from '../kotlin-schema-field.js';

describe('Kotlin Schema Fields', () => {
  it('generates Kotlin Types', async () => {

    const expectations: [string, string][] = [
      ['Number', 'Double'],
      ['Text', 'String'],
      ['URL', 'String'],
      ['Boolean', 'Boolean'],
      ['Byte', 'Byte'],
      ['Short', 'Short'],
      ['Int', 'Int'],
      ['Long', 'Long'],
      ['BigInt', 'BigInteger'],
      ['Char', 'Char'],
      ['Float', 'Float'],
      ['Double', 'Double'],
      ['[Text]', 'Set<String>'],
      ['List<Text>', 'List<String>'],
      ['inline Other1 {name: Text}', 'Other1'],
      ['[inline Other2 {name: Text}]', 'Set<Other2>'],
      ['List<inline Other3 {name: Text}>', 'List<Other3>'],
      ['&Ref1 {name: Text}', 'Reference<Ref1>?'],
      ['[&Ref2 {name: Text}]', 'Set<Reference<Ref2>>'],
      ['List<&Ref3 {name: Text}>', 'List<Reference<Ref3>>'],
    ];

    const manifest = await Manifest.parse(`\
      particle Foo
        thing: reads Thing {
${expectations.map(([arcsType], index) => `          field${index}: ${arcsType},\n`).join('')}
        }`);
    const [particle] = manifest.particles;
    const graph = new SchemaGraph(particle);
    assert.deepEqual(
      generateFields(graph.nodes[0]).map(field => field.type.kotlinType),
      expectations.map(([_, kotlinType]) => kotlinType)
    );
  });
  it('generates Kotlin Types for reference to external schema', async () => {

    const manifest = await Manifest.parse(`\
      schema Ref
        name: Text
      particle Foo
        num: reads Thing {ref: &Ref}
    `);
    assert.lengthOf(manifest.particles, 1);
    const [particle] = manifest.particles;
    const graph = new SchemaGraph(particle);
    assert.deepEqual(generateFields(graph.nodes[0]).map(field => field.type.kotlinType), [
      'Reference<Ref>?'
    ]);
  });
});
