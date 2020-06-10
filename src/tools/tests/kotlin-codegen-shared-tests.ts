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
import {generateConnectionSpecType} from '../kotlin-codegen-shared.js';
import {Manifest} from '../../runtime/manifest.js';
import {SchemaGraph} from '../schema2graph.js';

describe('Kotlin Handle Connection Type Generation', () => {
  it('generates type for singleton entity', async () => await assertConnectionType(`
    particle Module
      data: reads Thing {name: Text}
    `,
    'SingletonType(EntityType(Module_Data.SCHEMA))'
  ));
  it('generates type for singleton reference', async () => await assertConnectionType(`
    particle Module
      data: reads &Thing {name: Text}
    `,
    'SingletonType(ReferenceType(EntityType(Module_Data.SCHEMA)))'
  ));
  it('generates type for collection of entities', async () => await assertConnectionType(`
    particle Module
      data: reads [Thing {name: Text}]
    `,
    'CollectionType(EntityType(Module_Data.SCHEMA))'
  ));
  it('generates type for collection of references', async () => await assertConnectionType(`
    particle Module
      data: reads [&Thing {name: Text}]
    `,
    'CollectionType(ReferenceType(EntityType(Module_Data.SCHEMA)))'
  ));
  it('generates type for collection of tuples', async () => await assertConnectionType(`
    particle Module
      data: reads [(&Thing {name: Text}, &Other {age: Number})]
    `,
`CollectionType(
    TupleType.of(
        ReferenceType(EntityType(Module_Data_0.SCHEMA)),
        ReferenceType(EntityType(Module_Data_1.SCHEMA))
    )
)`
  ));

  async function assertConnectionType(manifestString: string, expected: string) {
    const manifest = await Manifest.parse(manifestString);
    const [particle] = manifest.particles;
    const schemaGraph = new SchemaGraph(particle);
    const [connection] = particle.handleConnections;
    const actual = generateConnectionSpecType(connection, schemaGraph.nodes);
    assert.equal(actual, expected);
  }
});
