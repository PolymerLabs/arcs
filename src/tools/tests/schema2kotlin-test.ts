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
import {Schema2Kotlin} from '../schema2kotlin.js';
import {SchemaGraph, SchemaNode} from '../schema2graph.js';

describe('schema2kotlin', () => {
  describe('Handle Interface Type', () => {
    it('Read Singleton Entity', async () => await assertHandleInterface(
      `particle P
         h: reads Thing {name: Text}`,
      'ReadSingletonHandle<P_H>'
    ));
    it('Write Singleton Entity', async () => await assertHandleInterface(
      `particle P
         h: writes Thing {name: Text}`,
      'WriteSingletonHandle<P_H>'
    ));
    it('Read Write Singleton Entity', async () => await assertHandleInterface(
      `particle P
         h: reads writes Thing {name: Text}`,
      'ReadWriteSingletonHandle<P_H>'
    ));
    it('Read Collection of Entities', async () => await assertHandleInterface(
      `particle P
         h: reads [Thing {name: Text}]`,
      'ReadCollectionHandle<P_H>'
    ));
    it('Write Collection of Entities', async () => await assertHandleInterface(
      `particle P
         h: writes [Thing {name: Text}]`,
      'WriteCollectionHandle<P_H>'
    ));
    it('Read Write Collection of Entities', async () => await assertHandleInterface(
      `particle P
         h: reads writes [Thing {name: Text}]`,
      'ReadWriteCollectionHandle<P_H>'
    ));
    it('Read Collection of Entities and Query by String', async () => await assertHandleInterface(
      `particle P
         h: reads [Thing {name: Text} [name == ?]]`,
      'ReadQueryCollectionHandle<P_H, String>'
    ));
    it('Read Write Collection of Entities and Query by Number', async () => await assertHandleInterface(
      `particle P
         h: reads writes [Thing {age: Number} [age > ?]]`,
      'ReadWriteQueryCollectionHandle<P_H, Double>'
    ));
    it('Read Reference Singleton', async () => await assertHandleInterface(
      `particle P
         h: reads &Thing {name: Text}`,
      'ReadSingletonHandle<Reference<P_H>>'
    ));
    it('Write Reference Singleton', async () => await assertHandleInterface(
      `particle P
         h: writes &Thing {name: Text}`,
      'WriteSingletonHandle<Reference<P_H>>'
    ));
    it('Read Collection of References', async () => await assertHandleInterface(
      `particle P
         h: reads [&Thing {name: Text}]`,
      'ReadCollectionHandle<Reference<P_H>>'
    ));
    it('Write Collection of References', async () => await assertHandleInterface(
      `particle P
         h: writes [&Thing {name: Text}]`,
      'WriteCollectionHandle<Reference<P_H>>'
    ));
    async function assertHandleInterface(manifestString: string, expectedHandleInterface: string) {
      const manifest = await Manifest.parse(manifestString);
      assert.lengthOf(manifest.particles, 1);
      assert.lengthOf(manifest.particles[0].connections, 1);

      const [particle] = manifest.particles;
      const [connection] = particle.connections;

      const graph = new SchemaGraph(particle);
      const entityType = SchemaNode.entityTypeForConnection(connection, graph.nodes);
      const schema2kotlin = new Schema2Kotlin({_: []});

      assert.equal(
        schema2kotlin.handleInterfaceType(connection, entityType),
        expectedHandleInterface);
    }
  });
  describe('Handles Class Declaration', () => {
    it('Single Read Handle', async () => await assertHandleClassDeclaration(
      `particle P
         h1: reads Person {name: Text}`,
      `class Handles : HandleHolderBase(
        "P",
        mapOf("h1" to P_H1)
    ) {
        val h1: ReadSingletonHandle<P_H1> by handles
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
        mapOf("h1" to P_H1, "h2" to P_H2, "h3" to P_H3)
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
        mapOf("h1" to P_H1)
    ) {
        val h1: ReadSingletonHandle<P_H1> by handles
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
        'typealias P_H1 = AbstractP.P_H1'
      ]
    ));
    it('Multiple Connections with the same Schema', async () => await assertSchemaAliases(
      `particle P
         h1: reads Person {name: Text}
         h2: reads [Person {name: Text}]
         h3: reads [&Person {name: Text}]
      `, [
        'typealias P_H1 = AbstractP.PInternal1',
        'typealias P_H2 = AbstractP.PInternal1',
        'typealias P_H3 = AbstractP.PInternal1',
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
        'typealias P_H1 = AbstractP.P_H1',
        'typealias P_H1_Home = AbstractP.P_H1_Home',
        'typealias P_H1_Home_Address = AbstractP.P_H1_Home_Address',
      ]
    ));
    async function assertSchemaAliases(manifest: string, expectedAliases: string[]) {
      await assertComponent(manifest, ({typeAliases}) => typeAliases.sort(), expectedAliases);
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
});
