/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {KotlinEntityGenerator} from '../kotlin-entity-generator.js';
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
    ) : EntityBase("Thing", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false)`
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
    ) : VariableEntityBase("T_H1", SCHEMA, entityId, creationTimestamp, expirationTimestamp, false)`
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
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateClassDefinition(),
      expectedValue);
  }

  async function assertCopyMethodsForWasm(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateCopyMethods(),
      expectedValue,
      {_: [], wasm: true});
  }

  async function assertCopyMethods(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateCopyMethods(),
      expectedValue);
  }

  async function assertFieldsDefinition(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateFieldsDefinitions(),
      expectedValue);
  }

  async function assertFieldsDefinitionForWasm(manifestString: string, expectedValue: string) {
    await assertGeneratorComponents<string>(
      manifestString,
      generator => generator.generateFieldsDefinitions(),
      expectedValue,
      {_: [], wasm: true});
  }

  // Asserts that a certain component from the Kotlin Generator, equals the
  // expected value.
  async function assertGeneratorComponents<T>(
    manifestString: string,
    extractor: (generator: KotlinEntityGenerator) => T,
    expectedValue: T,
    opts: minimist.ParsedArgs = {_: []}) {
    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    const [particle] = manifest.particles;

    const schema2kotlin = new Schema2Kotlin(opts);
    const generator = (await schema2kotlin.calculateNodeAndGenerators(particle))[0];
    const actualValue = extractor(generator.generator as KotlinEntityGenerator);

    assert.deepEqual(actualValue, expectedValue);
  }
});
