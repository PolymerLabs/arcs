/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-node.js';
import {KotlinSchemaDescriptor, generateSchema} from '../kotlin-schema-generator.js';
import {Manifest} from '../../runtime/manifest.js';
import {SchemaGraph} from '../schema2graph.js';

describe('Kotlin Schema Generator', () => {
  it('generates empty schema', async () => await assertSchemas(
    `particle T
         h1: reads {}`,
    [`Schema.EMPTY`]
  ));
  it('generates a schema with multiple names', async () => await assertSchemas(
    `particle T
         h1: reads Person Friend Parent {}`, [
`Schema(
    setOf(SchemaName("Person"), SchemaName("Friend"), SchemaName("Parent")),
    SchemaFields(
        singletons = emptyMap(),
        collections = emptyMap()
    ),
    "cd956ff7d2d4a14f434aa1427b84097d5c47037b",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates a schema with primitive fields', async () => await assertSchemas(
    `particle T
         h1: reads Person {name: Text, age: Number, friendNames: [Text]}`, [
`Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
        collections = mapOf("friendNames" to FieldType.Text)
    ),
    "accd28212161fc896d658e8c22c06051d1239e18",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates schemas for a reference', async () => await assertSchemas(
    `particle T
         h1: reads Person {address: &Address {streetAddress: Text}}`, [
`Schema(
    setOf(SchemaName("Address")),
    SchemaFields(
        singletons = mapOf("streetAddress" to FieldType.Text),
        collections = emptyMap()
    ),
    "41a3bd27b7c53f1c5846754291653d13f49e3e8d",
    refinement = { _ -> true },
    query = null
)`,
`Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf(
            "address" to FieldType.EntityRef("41a3bd27b7c53f1c5846754291653d13f49e3e8d")
        ),
        collections = emptyMap()
    ),
    "d44c98a544cbbdd187a7e0529046166ed6a4bcb0",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates a schema with a refinement', async () => await assertSchemas(
    `particle T
         h1: reads Person {name: Text, age: Number} [age >= 21]`, [
`Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
        collections = emptyMap()
    ),
    "edabcee36cb653ff468fb77804911ddfa9303d67",
    refinement = { data ->
        val age = data.singletons["age"].toPrimitiveValue(Double::class, 0.0)
        ((age > 21) || (age == 21))
    },
    query = null
)`
    ]
  ));
  it('generates a schema with a query', async () => await assertSchemas(
    `particle T
         h1: reads Person {name: Text, age: Number} [age >= ?]`, [
`Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
        collections = emptyMap()
    ),
    "edabcee36cb653ff468fb77804911ddfa9303d67",
    refinement = { _ -> true },
    query = { data, queryArgs ->
        val age = data.singletons["age"].toPrimitiveValue(Double::class, 0.0)
        val queryArgument = queryArgs as Double
        ((age > queryArgument) || (age == queryArgument))
    }
)`
    ]
  ));
  it('generates schemas for a tuple connection', async () => await assertSchemas(
    `particle T
         h1: reads (&Person {name: Text}, &Product {sku: Text})`, [
`Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf("name" to FieldType.Text),
        collections = emptyMap()
    ),
    "0149326a894f2d81705e1a08480330826f919cf0",
    refinement = { _ -> true },
    query = null
)`,
`Schema(
    setOf(SchemaName("Product")),
    SchemaFields(
        singletons = mapOf("sku" to FieldType.Text),
        collections = emptyMap()
    ),
    "32bcfc983b9ea6145aa42fbc525abb96baafbc1f",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));

  async function assertSchemas(manifestString: string, expectedValues: string[]) {
    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    const [particle] = manifest.particles;

    const graph = new SchemaGraph(particle);

    const actualValues = [];
    for (const node of graph.nodes) {
      await Promise.all([node, ...node.refs.values()].map(n => n.calculateHash()));
      const schemaDescriptor = new KotlinSchemaDescriptor(node, /* forWasm= */ false);
      actualValues.push(generateSchema(schemaDescriptor));
    }

    assert.sameDeepMembers(actualValues, expectedValues);
  }
});
