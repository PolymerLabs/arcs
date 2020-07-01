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
import {fs} from '../../platform/fs-web.js';
import {recipe2plan, OutputFormat} from '../recipe2plan.js';
import {Flags} from '../../runtime/flags.js';
import {ManifestProto} from '../manifest-proto.js';
import {Runtime} from '../../runtime/runtime.js';
import {Manifest} from '../../runtime/manifest.js';

const inputManifestPath = 'java/arcs/core/data/testdata/WriterReaderExample.arcs';
const readManifest = async () => await Runtime.parseFile(inputManifestPath);

describe('recipe2plan', () => {
  it('generates Kotlin plans from recipes in a manifest', Flags.withDefaultReferenceMode(async () => {
    assert.deepStrictEqual(
      await recipe2plan(await readManifest(), OutputFormat.Kotlin),
      fs.readFileSync('src/tools/tests/goldens/WriterReaderExample.kt', 'utf8'),
      `Golden is out of date! Make sure the new script is correct. If it is, update the goldens with:
$ tools/update-goldens \n\n`
    );
  }));
  it('generates Proto plans for multiple recipes in a manifest', Flags.withDefaultReferenceMode(async () => {
    const encoded = await recipe2plan(await readManifest(), OutputFormat.Proto) as Uint8Array;
    const decoded = ManifestProto.decode(encoded);

    // Only validating that the output can be can be decoded as a ManifestProto and right counts.
    // Tests for for encoding works are in manifest2proto-test.ts.
    assert.lengthOf(decoded['recipes'], 5);
    assert.lengthOf(decoded['particleSpecs'], 3);
  }));
  it('filters generated plans by provided name', Flags.withDefaultReferenceMode(async () => {
    const encoded = await recipe2plan(await readManifest(), OutputFormat.Proto, 'Consumption') as Uint8Array;
    const decoded = ManifestProto.decode(encoded);
    assert.lengthOf(decoded['recipes'], 1);
    assert.lengthOf(decoded['particleSpecs'], 1);
  }));
  it('outputs a valid protocol buffer for resolved recipes', Flags.withDefaultReferenceMode(async () => {
    assert.deepEqual(
      await protoPayloadFor(`
        particle Reader
          data: reads Thing {name: Text}
        particle Writer
          data: writes Thing {name: Text}

        @arcId('writeArcId')
        recipe WritingRecipe
          thing: create 'my-handle-id' @persistent
          Writer
            data: writes thing

        @arcId('readArcId')
        recipe ReadingRecipe
          data: map 'my-handle-id'
          Reader
            data: reads data

        recipe ReadWriteRecipe
          thing: create
          Writer
            data: writes thing
          Reader
            data: reads thing
      `), {
      particleSpecs: [{
        name: 'Reader',
        isolated: false,
        connections: [{
          name: 'data',
          direction: 'READS',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
          }}}
        }]
      }, {
        name: 'Writer',
        isolated: false,
        connections: [{
          name: 'data',
          direction: 'WRITES',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
          }}}
        }]
      }],
      recipes: [{
        name: 'WritingRecipe',
        annotations: [{
          name: 'arcId',
          params: [{
            name: 'id',
            strValue: 'writeArcId'
          }]
        }],
        handles: [{
          fate: 'CREATE',
          name: 'handle0',
          id: 'my-handle-id',
          annotations: [{name: 'persistent'}],
          storageKey: 'reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writeArcId/handle/my-handle-id}',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
          }}}
        }],
        particles: [{
          specName: 'Writer',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}
          }]
        }]
      },
      {
        name: 'ReadingRecipe',
        annotations: [{
          name: 'arcId',
          params: [{
            name: 'id',
            strValue: 'readArcId'
          }]
        }],
        handles: [{
          fate: 'MAP',
          name: 'handle0',
          id: 'my-handle-id',
          storageKey: 'reference-mode://{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/Thing}{db://25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516@arcs/!:writeArcId/handle/my-handle-id}',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
          }}}
        }],
        particles: [{
          specName: 'Reader',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}
          }],
        }]
      }, {
        name: 'ReadWriteRecipe',
        handles: [{
          fate: 'CREATE',
          name: 'handle0',
          storageKey: 'create://67835270998a62139f8b366f1cb545fb9b72a90b',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
          }}}
        }],
        particles: [{
          specName: 'Reader',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {entity: {schema: {
              names: ['Thing'],
              fields: {'name': {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}
          }]
        }, {
          specName: 'Writer',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}
          }],
        }]
      }]
    });
  }));
  it('outputs a valid protocol buffer for resolved recipes with type variables', Flags.withDefaultReferenceMode(async () => {
    assert.deepEqual(
      await protoPayloadFor(`
        particle Writer
          data: writes [Thing {name: Text}]
        particle Reader
          data: reads [~a]

        recipe ReadWriteRecipe
          thing: create
          Writer
            data: writes thing
          Reader
            data: reads thing
      `), {
      particleSpecs: [{
        name: 'Writer',
        isolated: false,
        connections: [{
          name: 'data',
          direction: 'WRITES',
          type: {collection: {collectionType:
            {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}
          }}
        }]
      }, {
        name: 'Reader',
        isolated: false,
        connections: [{
          name: 'data',
          direction: 'READS',
          // This type should not be resolved or constrained,
          // as this is a description of the particle spec, not an instance.
          type: {collection: {collectionType: {variable: {name: 'a'}}}}
        }]
      }],
      recipes: [{
        name: 'ReadWriteRecipe',
        handles: [{
          fate: 'CREATE',
          name: 'handle0',
          storageKey: 'create://67835270998a62139f8b366f1cb545fb9b72a90b',
          type: {collection: {collectionType: {
              entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}
          }}
        }],
        particles: [{
          specName: 'Reader',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}}}
          }]
        }, {
          specName: 'Writer',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516',
            }}}}}
          }],
        }]
      }]
    });
  }));
  async function protoPayloadFor(manifestString: string) {
    const manifest = await Manifest.parse(manifestString);
    // We encode and decode back to ensure that data can be serialized to proto and deserialized back.
    const encoded = await recipe2plan(manifest, OutputFormat.Proto, /* recipeFilter= */ null, 'random_salt') as Uint8Array;
    return ManifestProto.decode(encoded).toJSON();
  }
});
