/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {KotlinGenerator} from '../kotlin-class-generator.js';
import {Manifest} from '../../runtime/manifest.js';
import {assert} from '../../platform/chai-web.js';
import {Schema2Kotlin} from '../schema2kotlin.js';
import minimist from 'minimist';

describe('kotlin-class-generator', () => {
  it('generates entity with public constructor', async () => await assertClassDefinition(
    `particle T
         h1: reads Thing {num: Number}`,
    `@Suppress("UNCHECKED_CAST")
    class Thing(
        num: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Thing", SCHEMA, entityId, creationTimestamp, expirationTimestamp)`
  ));
  it('generates variable entity with private constructor', async () => await assertClassDefinition(
    `particle T
         h1: reads ~a with {num: Number}
         `,
    `@Suppress("UNCHECKED_CAST")
    class T_H1 private constructor(
        num: Double = 0.0,
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : VariableEntityBase("T_H1", SCHEMA, entityId, creationTimestamp, expirationTimestamp)`
  ));
  it('generates copy and mutate by entity fields', async () => await assertCopyMethods(
    `particle T
         h1: reads Thing {num: Number}`,
    `/**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(num: Double = this.num) = Thing(num = num)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(num: Double = this.num) = Thing(
            num = num,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )`
  ));
  // TODO(alxr): Why do we omit the docstring for Wasm?
  it('generates only copy method by entity fields for wasm', async () => await assertCopyMethodsForWasm(
    `particle T
         h1: reads Thing {num: Number}`,
    `
        fun copy(num: Double = this.num) = Thing(num = num)
        `
  ));
  it('copies underlying data for type variables.', async () => await assertCopyMethods(
    `particle T
         h1: reads ~a with Thing {num: Number}`,
    `/**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(num: Double = this.num) = Thing(num = num)
            .also { this.copyLatentDataInto(it) }
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(num: Double = this.num) = Thing(
            num = num,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        ).also { this.copyLatentDataInto(it) }`
  ));
  it('generates only copy method for variables for wasm', async () => await assertCopyMethodsForWasm(
    `particle T
         h1: reads  ~a with Thing {num: Number}`,
    `
        fun copy(num: Double = this.num) = Thing(num = num)
        `
  ));
  it('generates fields for entity when available', async () => await assertFieldsDefinition(
    `particle T
         h1: reads Thing {num: Number}`,
    `\

        var num: Double
            get() = super.getSingletonValue("num") as Double? ?: 0.0
            private set(_value) = super.setSingletonValue("num", _value)
        
        init {
            this.num = num
        }
        `
  ));
  it('generates an entityId property with Wasm', async () => await assertFieldsDefinitionForWasm(
    `particle T
         h1: reads Thing {num: Number}`,
    `\

        var num = num
            get() = field
            private set(_value) {
                field = _value
            }
        
        override var entityId = ""`
  ));
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

  async function assertClassDefinition(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateClassDefinition(),
      [expectedValue]);
  }

  async function assertCopyMethodsForWasm(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateCopyMethods(),
      [expectedValue],
      {_: [], wasm: true});
  }

  async function assertCopyMethods(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateCopyMethods(),
      [expectedValue]);
  }

  async function assertFieldsDefinition(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateFieldsDefinitions(),
      [expectedValue]);
  }

  async function assertFieldsDefinitionForWasm(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateFieldsDefinitions(),
      [expectedValue],
      {_: [], wasm: true});
  }

  async function assertSchemas(manifestString: string, expectedValues: string[]) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateSchema(),
      expectedValues);
  }

  // Asserts that a certain component from the Kotlin Generator, equals the
  // expected value.
  async function assertGeneratorComponents<T>(
    manifestString: string,
    extractor: (generator: KotlinGenerator) => T,
    expectedValues: T[],
    opts: minimist.ParsedArgs = {_: []}) {
    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    const [particle] = manifest.particles;

    const schema2kotlin = new Schema2Kotlin(opts);
    const generators = await schema2kotlin.calculateNodeAndGenerators(particle);
    const actualValues = generators.map(g => extractor(g.generator as KotlinGenerator));

    // We could do the followiong asserting with a one liner, e.g.
    //   assert.sameDeepMembers(actualValues, expectedValues);
    // But comparing values one by one gives much nicer debug messages
    // for multiline strings, diffing each string line by line and
    // printing '\n' with new lines.
    assert.equal(actualValues.length, expectedValues.length);
    for (let i = 0; i < actualValues.length; i++) {
      assert.equal(actualValues[i], expectedValues[i]);
    }
  }
});
