/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {KotlinGenerator, Schema2Kotlin} from '../schema2kotlin.js';
import {SchemaGraph} from '../schema2graph.js';
import minimist from 'minimist';

describe('schema2kotlin', () => {
  describe('Handle Interface Type', () => {
    it('Read Singleton Entity', async () => await assertHandleInterface(
      `particle P
         h: reads Thing {name: Text}`,
      'ReadSingletonHandle<Thing>'
    ));
    it('Write Singleton Entity', async () => await assertHandleInterface(
      `particle P
         h: writes Thing {name: Text}`,
      'WriteSingletonHandle<Thing>'
    ));
    it('Read Write Singleton Entity', async () => await assertHandleInterface(
      `particle P
         h: reads writes Thing {name: Text}`,
      'ReadWriteSingletonHandle<Thing>'
    ));
    it('Read Write Anonymous Entity', async () => await assertHandleInterface(
      `particle P
         h: reads writes * {name: Text}`,
      'ReadWriteSingletonHandle<P_H>'
    ));
    it('Read Collection of Entities', async () => await assertHandleInterface(
      `particle P
         h: reads [Thing {name: Text}]`,
      'ReadCollectionHandle<Thing>'
    ));
    it('Write Collection of Entities', async () => await assertHandleInterface(
      `particle P
         h: writes [Thing {name: Text}]`,
      'WriteCollectionHandle<Thing>'
    ));
    it('Read Write Collection of Entities', async () => await assertHandleInterface(
      `particle P
         h: reads writes [Thing {name: Text}]`,
      'ReadWriteCollectionHandle<Thing>'
    ));
    it('Read Collection of Entities and Query by String', async () => await assertHandleInterface(
      `particle P
         h: reads [Thing {name: Text} [name == ?]]`,
      'ReadQueryCollectionHandle<Thing, String>'
    ));
    it('Read Write Collection of Entities and Query by Number', async () => await assertHandleInterface(
      `particle P
         h: reads writes [Thing {age: Number} [age > ?]]`,
      'ReadWriteQueryCollectionHandle<Thing, Double>'
    ));
    it('Read Reference Singleton', async () => await assertHandleInterface(
      `particle P
         h: reads &Thing {name: Text}`,
      'ReadSingletonHandle<Reference<Thing>>'
    ));
    it('Write Reference Singleton', async () => await assertHandleInterface(
      `particle P
         h: writes &Thing {name: Text}`,
      'WriteSingletonHandle<Reference<Thing>>'
    ));
    it('Read Collection of References', async () => await assertHandleInterface(
      `particle P
         h: reads [&Thing {name: Text}]`,
      'ReadCollectionHandle<Reference<Thing>>'
    ));
    it('Write Collection of References', async () => await assertHandleInterface(
      `particle P
         h: writes [&Thing {name: Text}]`,
      'WriteCollectionHandle<Reference<Thing>>'
    ));
    it('Read Tuple of 2 References', async () => await assertHandleInterface(
      `particle P
         h: reads (&Foo {name: Text}, &Bar {age: Number})`,
      'ReadSingletonHandle<Tuple2<Reference<Foo>, Reference<Bar>>>'
    ));
    it('Write Collection of Tuples of 3 References', async () => await assertHandleInterface(
      `particle P
         h: writes [(&Foo {name: Text}, &Bar {age: Number}, &Baz {isThisIt: Boolean})]`,
      'WriteCollectionHandle<Tuple3<Reference<Foo>, Reference<Bar>, Reference<Baz>>>'
    ));
    it('Read Singleton Variable Entity', async () => await assertHandleInterface(
      `particle T
         h: reads ~a with {name: Text}`,
      'ReadSingletonHandle<T_H>'
    ));
    it('Write Singleton Variable Entity', async () => await assertHandleInterface(
      `particle T
         h: writes ~a with {name: Text}`,
      'WriteSingletonHandle<T_H>'
    ));
    it('Read Write Singleton Unconstrained Variable Entity', async () => await assertHandleInterface(
      `particle T
         h: reads writes ~a`,
      'ReadWriteSingletonHandle<T_H>'
    ));
    async function assertHandleInterface(manifestString: string, expectedHandleInterface: string) {
      const manifest = await Manifest.parse(manifestString);
      assert.lengthOf(manifest.particles, 1);
      assert.lengthOf(manifest.particles[0].connections, 1);

      const [particle] = manifest.particles;
      const [connection] = particle.connections;

      const graph = new SchemaGraph(particle);
      const schema2kotlin = new Schema2Kotlin({_: []});

      assert.equal(
        schema2kotlin.handleInterfaceType(connection, graph.nodes, /* particleScope= */ true),
        expectedHandleInterface);
    }
  });
  describe('Handles Class Declaration', () => {
    it('Single Read Handle', async () => await assertHandleClassDeclaration(
      `particle P
         h1: reads Person {name: Text}`,
      `class Handles : HandleHolderBase(
        "P",
        mapOf("h1" to setOf(Person))
    ) {
        val h1: ReadSingletonHandle<Person> by handles
    }`
    ));
    it('Conflicting Schema Names', async () => await assertHandleClassDeclaration(
      `particle P
         h1: reads Person {name: Text}
         h2: reads Person {age: Number}`,
      `class Handles : HandleHolderBase(
        "P",
        mapOf("h1" to setOf(P_H1), "h2" to setOf(P_H2))
    ) {
        val h1: ReadSingletonHandle<P_H1> by handles
        val h2: ReadSingletonHandle<P_H2> by handles
    }`
    ));
    it('Read, Write and Query Handles', async () => await assertHandleClassDeclaration(
      `particle P
        h1: reads Person {name: Text}
        h2: writes Person {name: Text}
        h3: reads [Person {name: Text} [name == ?]]
      `,
      `class Handles : HandleHolderBase(
        "P",
        mapOf("h1" to setOf(P_H1), "h2" to setOf(P_H2), "h3" to setOf(P_H3))
    ) {
        val h1: ReadSingletonHandle<P_H1> by handles
        val h2: WriteSingletonHandle<P_H2> by handles
        val h3: ReadQueryCollectionHandle<P_H3, String> by handles
    }`
    ));
    it('Handle with references', async () => await assertHandleClassDeclaration(
      `particle P
        h1: reads Person {
          name: Text,
          home: &Accommodation {
            squareFootage: Number,
            address: &Address {
              streetAddress: Text,
              postCode: Text  
            }
          }
        }
      `,
      `class Handles : HandleHolderBase(
        "P",
        mapOf("h1" to setOf(Person))
    ) {
        val h1: ReadSingletonHandle<Person> by handles
    }`
    ));
    it('Handle with a tuple', async () => await assertHandleClassDeclaration(
      `particle P
        h1: reads (
          &Person {name: Text},
          &Accommodation {squareFootage: Number},
          &Address {streetAddress: Text, postCode: Text}
        )
      `,
      `class Handles : HandleHolderBase(
        "P",
        mapOf("h1" to setOf(Person, Accommodation, Address))
    ) {
        val h1: ReadSingletonHandle<Tuple3<Reference<Person>, Reference<Accommodation>, Reference<Address>>> by handles
    }`
    ));
    it('Progressively constrained Variable Handles', async () => await assertHandleClassDeclaration(
      `particle T
         h1: reads ~a
         h2: writes ~a with {amt: Number}
         h3: reads writes ~a with {name: Text, age: Number}
         `,
      `class Handles : HandleHolderBase(
        "T",
        mapOf("h1" to setOf(T_H1), "h2" to setOf(T_H2), "h3" to setOf(T_H3))
    ) {
        val h1: ReadSingletonHandle<T_H1> by handles
        val h2: WriteSingletonHandle<T_H2> by handles
        val h3: ReadWriteSingletonHandle<T_H3> by handles
    }`
    ));
    async function assertHandleClassDeclaration(manifest: string, expectedHandleClass: string) {
      await assertComponent(manifest, ({handleClassDecl}) => handleClassDecl, expectedHandleClass);
    }
  });
  describe('Schema Aliases', () => {
    it('Single Entity', async () => await assertSchemaAliases(
      `particle P
        h1: reads Person {name: Text}
      `, [
        'typealias P_H1 = AbstractP.Person'
      ]
    ));
    it('Multiple Connections with the same Schema', async () => await assertSchemaAliases(
      `particle P
         h1: reads Person {name: Text}
         h2: reads [Person {name: Text}]
         h3: reads [&Person {name: Text}]
      `, [
        'typealias P_H1 = AbstractP.Person',
        'typealias P_H2 = AbstractP.Person',
        'typealias P_H3 = AbstractP.Person',
      ]
    ));
    it('Handle with references', async () => await assertSchemaAliases(
      `particle P
        h1: reads Person {
          name: Text,
          home: &Accommodation {
            squareFootage: Number,
            address: &Address {
              streetAddress: Text,
              postCode: Text  
            }
          }
        }
      `, [
        'typealias P_H1 = AbstractP.Person',
        'typealias P_H1_Home = AbstractP.Accommodation',
        'typealias P_H1_Home_Address = AbstractP.Address',
      ]
    ));
    it('Handle with a tuple', async () => await assertSchemaAliases(
      `particle P
        h1: reads (
          &Person {name: Text},
          &Accommodation {squareFootage: Number},
          &Address {streetAddress: Text, postCode: Text}
        )
      `, [
        'typealias P_H1_0 = AbstractP.Person',
        'typealias P_H1_1 = AbstractP.Accommodation',
        'typealias P_H1_2 = AbstractP.Address',
      ]
    ));
    it('Unconstrained variables', async () => await assertSchemaAliases(
      `particle T
         h1: reads ~a
         h2: writes ~a 
      `, [
        'typealias T_H1 = AbstractT.TInternal1',
        'typealias T_H2 = AbstractT.TInternal1',
      ]
    ));
    it('Variable constrained at multiple connections', async () => await assertSchemaAliases(
      `particle T
         h1: reads ~a
         h2: writes ~a with {amt: Number}
         h3: reads writes ~a with {name: Text, age: Number}
      `, [
        'typealias T_H1 = AbstractT.TInternal1',
        'typealias T_H2 = AbstractT.TInternal1',
        'typealias T_H3 = AbstractT.TInternal1',
      ]
    ));
    it('Different internal entities for distinct aliases', async () => await assertSchemaAliases(
      `particle T
         h1: reads ~a
         h2: writes &~a with {x: Number}
         h3: reads ~b
         h4: reads [~b with {a: Text}]`, [
        'typealias T_H1 = AbstractT.TInternal1',
        'typealias T_H2 = AbstractT.TInternal1',
        'typealias T_H3 = AbstractT.TInternal2',
        'typealias T_H4 = AbstractT.TInternal2',
      ]
    ));
    async function assertSchemaAliases(manifest: string, expectedAliases: string[]) {
      await assertComponent(manifest, ({typeAliases}) => typeAliases.sort(), expectedAliases);
    }
  });
  describe('Entity Class Generation', () => {
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
    async function assertClassDefinition(manifestString: string, expectedValue: string) {
      await assertGeneratorComponent<string>(
        manifestString,
        generator => generator.generateClassDefinition(),
        expectedValue);
    }
    async function assertCopyMethodsForWasm(manifestString: string, expectedValue: string) {
      await assertGeneratorComponent<string>(
        manifestString,
        generator => generator.generateCopyMethods(),
        expectedValue,
        {_: [], wasm: true});
    }
    async function assertCopyMethods(manifestString: string, expectedValue: string) {
      await assertGeneratorComponent<string>(
        manifestString,
        generator => generator.generateCopyMethods(),
        expectedValue);
    }
    async function assertFieldsDefinition(manifestString: string, expectedValue: string) {
      await assertGeneratorComponent<string>(
        manifestString,
        generator => generator.generateFieldsDefinitions(),
        expectedValue);
    }
    async function assertFieldsDefinitionForWasm(manifestString: string, expectedValue: string) {
      await assertGeneratorComponent<string>(
        manifestString,
        generator => generator.generateFieldsDefinitions(),
        expectedValue,
        {_: [], wasm: true});
    }

  });
  describe('Test Harness', () => {
    it('exposes a handle as a read write handle regardless of particle spec direction', async () => await assertTestHarness(
      `particle P
        h1: reads Person {name: Text}
        h2: reads Address {streetAddress: Text}
      `, `
class PTestHarness<P : AbstractP>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    HandleSpec("h1", HandleMode.ReadWrite, SingletonType(EntityType(P_H1.SCHEMA)), setOf(P_H1)),
    HandleSpec("h2", HandleMode.ReadWrite, SingletonType(EntityType(P_H2.SCHEMA)), setOf(P_H2))
)) {
    val h1: ReadWriteSingletonHandle<P_H1> by handleMap
    val h2: ReadWriteSingletonHandle<P_H2> by handleMap
}
`
    ));
    it('specifies handle type correctly - singleton, collection, entity, reference, tuples', async () => await assertTestHarness(
      `particle P
        singletonEntity: reads Person {name: Text}
        singletonReference: writes &Person {name: Text}
        collectionEntity: writes [Person {name: Text}]
        collectionReference: reads [&Person {name: Text}]
        collectionTuples: reads [(&Product {name: Text}, &Manufacturer {name: Text})]
  `, `
class PTestHarness<P : AbstractP>(
    factory : (CoroutineScope) -> P
) : BaseTestHarness<P>(factory, listOf(
    HandleSpec(
        "singletonEntity",
        HandleMode.ReadWrite,
        SingletonType(EntityType(P_SingletonEntity.SCHEMA)),
        setOf(P_SingletonEntity)
    ),
    HandleSpec(
        "singletonReference",
        HandleMode.ReadWrite,
        SingletonType(ReferenceType(EntityType(P_SingletonReference.SCHEMA))),
        setOf(P_SingletonReference)
    ),
    HandleSpec(
        "collectionEntity",
        HandleMode.ReadWrite,
        CollectionType(EntityType(P_CollectionEntity.SCHEMA)),
        setOf(P_CollectionEntity)
    ),
    HandleSpec(
        "collectionReference",
        HandleMode.ReadWrite,
        CollectionType(ReferenceType(EntityType(P_CollectionReference.SCHEMA))),
        setOf(P_CollectionReference)
    ),
    HandleSpec(
        "collectionTuples",
        HandleMode.ReadWrite,
        CollectionType(
            TupleType.of(
                ReferenceType(EntityType(P_CollectionTuples_0.SCHEMA)),
                ReferenceType(EntityType(P_CollectionTuples_1.SCHEMA))
            )
        ),
        setOf(P_CollectionTuples_0, P_CollectionTuples_1)
    )
)) {
    val singletonEntity: ReadWriteSingletonHandle<P_SingletonEntity> by handleMap
    val singletonReference: ReadWriteSingletonHandle<Reference<P_SingletonReference>> by handleMap
    val collectionEntity: ReadWriteCollectionHandle<P_CollectionEntity> by handleMap
    val collectionReference: ReadWriteCollectionHandle<Reference<P_CollectionReference>> by handleMap
    val collectionTuples: ReadWriteCollectionHandle<Tuple2<Reference<P_CollectionTuples_0>, Reference<P_CollectionTuples_1>>> by handleMap
}
`
    ));
    async function assertTestHarness(manifestString: string, expected: string) {
      const manifest = await Manifest.parse(manifestString);
      assert.lengthOf(manifest.particles, 1);
      const [particle] = manifest.particles;

      const schema2kotlin = new Schema2Kotlin({_: []});
      const generators = await schema2kotlin.calculateNodeAndGenerators(particle);
      const nodes = generators.map(g => g.node);
      const actual = schema2kotlin.generateTestHarness(particle, nodes);
      assert.equal(actual, expected);
    }
  });

  // Asserts that a certain generated component, i.e. one of the results of the
  // generateParticleClassComponents equals the expected value.
  async function assertComponent<T>(
      manifestString: string,
      extractor: <T>({typeAliases, classes, handleClassDecl}) => T,
      expectedValue: T) {
    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    const [particle] = manifest.particles;

    const schema2kotlin = new Schema2Kotlin({_: []});
    const generators = await schema2kotlin.calculateNodeAndGenerators(particle);
    const components = schema2kotlin.generateParticleClassComponents(particle, generators);
    assert.deepEqual(extractor(components), expectedValue);
  }

  // Asserts that a certain component from the Kotlin Generator, equals the
  // expected value.
  async function assertGeneratorComponent<T>(
    manifestString: string,
    extractor: (generator: KotlinGenerator) => T,
    expectedValue: T,
    opts: minimist.ParsedArgs = {_: []}) {
    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    const [particle] = manifest.particles;

    const schema2kotlin = new Schema2Kotlin(opts);
    const generators = await schema2kotlin.calculateNodeAndGenerators(particle);
    const generator = (generators[0].generator as KotlinGenerator);
    assert.deepEqual(extractor(generator), expectedValue);
  }

});
