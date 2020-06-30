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
import {generateSchema} from '../kotlin-schema-generator.js';
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
         h1: reads Person Friend Parent {}`, [`\
Schema(
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
         h1: reads Person {name: Text, age: Number, friendNames: [Text]}`, [`\
Schema(
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
  it('generates a schema with Kotlin types', async () => await assertSchemas(`
    particle T
      h1: reads Data {
        bt: Byte,
        shrt: Short,
        nt: Int,
        lng: Long,
        chr: Char,
        flt: Float,
        dbl: Double,
      }`, [`\
Schema(
    setOf(SchemaName("Data")),
    SchemaFields(
        singletons = mapOf(
            "bt" to FieldType.Byte,
            "shrt" to FieldType.Short,
            "nt" to FieldType.Int,
            "lng" to FieldType.Long,
            "chr" to FieldType.Char,
            "flt" to FieldType.Float,
            "dbl" to FieldType.Double
        ),
        collections = emptyMap()
    ),
    "e444f20e280c14494a71cc6838bb97a18a14ea49",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates a schema with lists of primitive fields', async () => await assertSchemas(
    `particle T
         h1: reads Person {names: List<Text>, favNumbers: List<Number>}`, [`\
Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf(
            "names" to FieldType.ListOf(FieldType.Text),
            "favNumbers" to FieldType.ListOf(FieldType.Number)
        ),
        collections = emptyMap()
    ),
    "601707171fccbedc3f8d2506c326d6f0fddaaa04",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates schemas for a reference', async () => await assertSchemas(
    `particle T
         h1: reads Person {address: &Address {streetAddress: Text}}`, [`\
Schema(
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
)`, `\
Schema(
    setOf(SchemaName("Address")),
    SchemaFields(
        singletons = mapOf("streetAddress" to FieldType.Text),
        collections = emptyMap()
    ),
    "41a3bd27b7c53f1c5846754291653d13f49e3e8d",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates schemas for a collection of references', async () => await assertSchemas(
    `particle T
         h1: reads Person {address: [&Address {streetAddress: Text}]}`, [`\
Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = emptyMap(),
        collections = mapOf(
            "address" to FieldType.EntityRef("41a3bd27b7c53f1c5846754291653d13f49e3e8d")
        )
    ),
    "e386e5e1ae663a3b491008c6e931d81a5166ce20",
    refinement = { _ -> true },
    query = null
)`, `\
Schema(
    setOf(SchemaName("Address")),
    SchemaFields(
        singletons = mapOf("streetAddress" to FieldType.Text),
        collections = emptyMap()
    ),
    "41a3bd27b7c53f1c5846754291653d13f49e3e8d",
    refinement = { _ -> true },
    query = null
)`,
    ]
  ));
  it('generates schemas for a nested entity', async () => await assertSchemas(
    `particle T
         h1: reads Person {address: inline Address {streetAddress: Text}}`, [`\
Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf(
            "address" to FieldType.InlineEntity("41a3bd27b7c53f1c5846754291653d13f49e3e8d")
        ),
        collections = emptyMap()
    ),
    "0c8f412660e502d17b310fadf8e950083965e3d5",
    refinement = { _ -> true },
    query = null
)`, `\
Schema(
    setOf(SchemaName("Address")),
    SchemaFields(
        singletons = mapOf("streetAddress" to FieldType.Text),
        collections = emptyMap()
    ),
    "41a3bd27b7c53f1c5846754291653d13f49e3e8d",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates schemas for a double nested entity', async () => await assertSchemas(`
    particle T
      h1: reads Person {
        address: inline Address {
          streetAddress: Text,
          city: inline City {name: Text}
        }
      }`, [`\
Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf(
            "address" to FieldType.InlineEntity("357fa6d61d95ea4234984c2341bf1eb4664cc534")
        ),
        collections = emptyMap()
    ),
    "3932685180303cb50fc7493ab5ca4543ac176866",
    refinement = { _ -> true },
    query = null
)`, `\
Schema(
    setOf(SchemaName("Address")),
    SchemaFields(
        singletons = mapOf(
            "streetAddress" to FieldType.Text,
            "city" to FieldType.InlineEntity("783a4126e47d586196d9e80810b67199edcb04da")
        ),
        collections = emptyMap()
    ),
    "357fa6d61d95ea4234984c2341bf1eb4664cc534",
    refinement = { _ -> true },
    query = null
)`, `\
Schema(
    setOf(SchemaName("City")),
    SchemaFields(
        singletons = mapOf("name" to FieldType.Text),
        collections = emptyMap()
    ),
    "783a4126e47d586196d9e80810b67199edcb04da",
    refinement = { _ -> true },
    query = null
)`
    ]
  ));
  it('generates a schema with a refinement', async () => await assertSchemas(
    `particle T
         h1: reads Person {name: Text, age: Number} [age >= 21]`, [`\
Schema(
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
         h1: reads Person {name: Text, age: Number} [age >= ?]`, [`\
Schema(
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
         h1: reads (&Person {name: Text}, &Product {sku: Text})`, [`\
Schema(
    setOf(SchemaName("Person")),
    SchemaFields(
        singletons = mapOf("name" to FieldType.Text),
        collections = emptyMap()
    ),
    "0149326a894f2d81705e1a08480330826f919cf0",
    refinement = { _ -> true },
    query = null
)`, `\
Schema(
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
      actualValues.push(await generateSchema(node.schema));
    }

    assert.sameDeepMembers(actualValues, expectedValues);
  }
});
