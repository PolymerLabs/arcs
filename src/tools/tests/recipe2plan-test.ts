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
import {assertThrowsAsync} from '../../testing/test-util.js';


describe('recipe2plan', () => {
  const inputManifestPath = 'java/arcs/core/data/testdata/WriterReaderExample.arcs';
  const policiesManifestPath = 'java/arcs/core/data/testdata/WriterReaderPoliciesExample.arcs';

  let runtime;
  const readManifest = async (manifestPath) => runtime.parseFile(manifestPath);

  before(() => {
    runtime = new Runtime({rootPath: '../..'});
  });

  it('generates Kotlin plans from recipes in a manifest', Flags.withDefaultReferenceMode(async () => {
    const writerReaderExample = await recipe2plan(await readManifest(inputManifestPath),
        OutputFormat.Kotlin, await readManifest(policiesManifestPath));
    assert.deepStrictEqual(
      writerReaderExample,
      fs.readFileSync('src/tools/tests/goldens/WriterReaderExample.kt', 'utf8'),
      `Golden is out of date! Make sure the new script is correct. If it is, update the goldens with:
$ tools/update-goldens \n\n`
    );
  }));
  it('generates Proto plans for multiple recipes in a manifest', Flags.withDefaultReferenceMode(async () => {
    const encoded = await recipe2plan(await readManifest(inputManifestPath), OutputFormat.Proto, await readManifest(policiesManifestPath)) as Uint8Array;
    const decoded = ManifestProto.decode(encoded);

    // Only validating that the output can be can be decoded as a ManifestProto and right counts.
    // Tests for for encoding works are in manifest2proto-test.ts.
    assert.lengthOf(decoded['recipes'], 6);
    assert.lengthOf(decoded['particleSpecs'], 3);
  }));
  it('filters generated plans by provided name', Flags.withDefaultReferenceMode(async () => {
    const encoded = await recipe2plan(await readManifest(inputManifestPath), OutputFormat.Proto, await readManifest(policiesManifestPath), 'Consumption') as Uint8Array;
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
          thing: create 'my-handle-id' @persistent @ttl('30d')
          Writer
            data: writes thing

        @arcId('readArcId')
        recipe ReadingRecipe
          data: map 'my-handle-id'
          Reader
            data: reads data

        recipe ReadWriteRecipe
          thing: create @inMemory @ttl('10d')
          Writer
            data: writes thing
          Reader
            data: reads thing
      `), {
      particleSpecs: [{
        name: 'Reader',
        connections: [{
          name: 'data',
          direction: 'READS',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
          }}}
        }]
      }, {
        name: 'Writer',
        connections: [{
          name: 'data',
          direction: 'WRITES',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
          annotations: [{
            name: 'persistent'
          },
          {
            'name': 'ttl',
            'params': [{
              'name': 'value',
              'strValue': '30d'
            }]
          }],
          storageKey: 'reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writeArcId/handle/my-handle-id}',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
          storageKey: 'reference-mode://{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/Thing}{db://503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b@arcs/!:writeArcId/handle/my-handle-id}',
          type: {entity: {schema: {
            names: ['Thing'],
            fields: {name: {primitive: 'TEXT'}},
            hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
            hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
          }}},
          annotations: [{
            name: 'inMemory'
          },
          {
            'name': 'ttl',
            'params': [{
              'name': 'value',
              'strValue': '10d'
            }]
          }],
        }],
        particles: [{
          specName: 'Reader',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {entity: {schema: {
              names: ['Thing'],
              fields: {'name': {primitive: 'TEXT'}},
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
          thing: create @inMemory @ttl('12d')
          Writer
            data: thing
          Reader
            data: thing
      `), {
      particleSpecs: [{
        name: 'Writer',
        connections: [{
          name: 'data',
          direction: 'WRITES',
          type: {collection: {collectionType:
            {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
            }}}
          }},
        }]
      }, {
        name: 'Reader',
        connections: [{
          name: 'data',
          direction: 'READS',
          // This type should not be resolved or constrained,
          // as this is a description of the particle spec, not an instance.
          type: {collection: {collectionType: {variable: {name: 'a', constraint: {maxAccess: false}}}}}
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
              hash: '239fa577fcc63fc84d28a2f5e98199847c239629',
            }}}
          }},
          annotations: [{
            name: 'inMemory'
          },
          {
            'name': 'ttl',
            'params': [{
              'name': 'value',
              'strValue': '12d'
            }]
          }],

        }],
        particles: [{
          specName: 'Reader',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Thing'],
              hash: '239fa577fcc63fc84d28a2f5e98199847c239629',
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
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
            }}}}}
          }],
        }]
      }]
    });
  }));
  // TODO(mmandlis): fix this. the problem is that `~a with {name: Text}`
  // is being resolved to a schema without a name, which then cannot be found in policies.
  it.skip('outputs a valid protocol buffer for resolved recipes with star type variables', Flags.withDefaultReferenceMode(async () => {
    assert.deepEqual(
      await protoPayloadFor(`
        particle Writer
          data: writes [Thing {name: Text}]
        particle Reader
          data: reads [~a with {name: Text}]

        recipe ReadWriteRecipe
          thing: create @inMemory @ttl('12d')
          Writer
            data: thing
          Reader
            data: thing
      `), {
      particleSpecs: [{
        name: 'Writer',
        connections: [{
          name: 'data',
          direction: 'WRITES',
          type: {collection: {collectionType:
            {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
            }}}
          }},
        }]
      }, {
        name: 'Reader',
        connections: [{
          name: 'data',
          direction: 'READS',
          // This type should not be resolved or constrained,
          // as this is a description of the particle spec, not an instance.
          type: {collection: {collectionType: {variable: {name: 'a', constraint: {maxAccess: false}}}}}
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
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
            }}}
          }},
          annotations: [{
            name: 'inMemory'
          },
          {
            'name': 'ttl',
            'params': [{
              'name': 'value',
              'strValue': '12d'
            }]
          }],

        }],
        particles: [{
          specName: 'Reader',
          connections: [{
            name: 'data',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Thing'],
              fields: {name: {primitive: 'TEXT'}},
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
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
              hash: '503ee2172e4a0ec16b2c7245ae8b7dd30fe9315b',
            }}}}}
          }],
        }]
      }]
    });
  }));
  async function protoPayloadFor(manifestString: string) {
    const manifest = await Manifest.parse(manifestString);
    // We encode and decode back to ensure that data can be serialized to proto and deserialized back.
    const encoded = await recipe2plan(manifest, OutputFormat.Proto, await readManifest(policiesManifestPath), /* recipeFilter= */ null, 'random_salt') as Uint8Array;
    return ManifestProto.decode(encoded).toJSON();
  }
  const manifestMetaAndParticleSpecs = `
meta
  namespace: arcs.core.data.testdata
particle WriteFoo
  foo: writes [Foo {f1: Text, f2: Text, f3: Text}]
particle WriteBar
  bar: writes Bar {br1: Text, br2: Text}
particle ReadFooWriteBaz
  foo: reads [Foo {f1: Text, f2: Text}]
  baz: writes Baz {bz1: Text}
particle ReadFooBarWriteBazzz
  foo: reads [Foo {f1: Text}]
  bar: reads Bar {br1: Text}
  bazzz: writes [Baz {bz1: Text}]
particle ReadQuxWriteBazzz
  qux: reads Qux {q1: Text}
  bazzz: writes [Baz {bz1: Text}]
  `;
  const policiesManifestStr = `
schema Foo
  f1: Text
  f2: Text
  f3: Text
schema Bar
  br1: Text
  br2: Text
  br3: Text
schema Qux
  q1: Text
policy PolicyFooF1BarBr1Br2 {
  @allowedRetention(medium: 'Disk', encryption: false)
  @maxAge('1d')
  from Foo access { f1 }

  @allowedRetention(medium: 'Disk', encryption: false)
  @maxAge('2d')
  from Bar access { br1, br2 }

  @allowedRetention(medium: 'Disk', encryption: false)
  @maxAge('20h')
  from Qux access { q1 }
}
policy PolicyFooF1F2 {
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('10h')
  from Foo access { f1, f2 }
}
policy PolicyBarBr2Br3 {
  @allowedRetention(medium: 'Ram', encryption: true)
  @maxAge('10m')
  from Bar access { br2, br3 }
}
  `;
  const assertSuccess = async (recipeStr) => verifyRecipeIngress(recipeStr, true);
  const assertFailure = async (recipeStr) => verifyRecipeIngress(recipeStr, false);
  const verifyRecipeIngress = async (recipeStr: string, expectedSuccess: boolean) => {
    const recipesManifest = await Manifest.parse(`
${manifestMetaAndParticleSpecs}
${recipeStr}
    `);
    const policiesManifest = await Manifest.parse(policiesManifestStr);
    if (expectedSuccess) {
      const result = await recipe2plan(recipesManifest, OutputFormat.Kotlin, policiesManifest);
      assert.isTrue(result.toString().includes(`val MyRecipePlan by lazy {\n    Plan(`));
    } else {
      await assertThrowsAsync(
          async () => recipe2plan(recipesManifest, OutputFormat.Kotlin, policiesManifest),
          'Failed ingress validation for plan MyRecipe');
    }
  };
  it('generates kotlin plans with derived data capabilities persistence verification', Flags.withDefaultReferenceMode(async () => {
    const bazRecipeStr = (bazPersistence) => `
recipe MyRecipe
  fooHandle: create 'foos' @inMemory @ttl('10h')
  barHandle: create 'bar' @persistent @ttl('2d')
  bazHandle: create 'baz' @ttl('10h') ${bazPersistence}
  WriteFoo
    foo: fooHandle
  WriteBar
    bar: barHandle
  ReadFooWriteBaz
    foo: fooHandle
    baz: bazHandle`;
    await assertFailure(bazRecipeStr('@persistent'));
    await assertSuccess(bazRecipeStr('@inMemory'));
  }));

  it('generates kotlin plans with derived data capabilities ttl verification', Flags.withDefaultReferenceMode(async () => {
    const bazzzRecipeStr = (bazzzTtl) => `
recipe MyRecipe
  fooHandle: create 'foos' @inMemory @ttl('10h')
  barHandle: create 'bar' @persistent @ttl('2d')
  quxHandle: create 'qux' @persistent @ttl('20h')
  bazzzHandle: create 'bazzz' @persistent @ttl('${bazzzTtl}')
  WriteFoo
    foo: fooHandle
  WriteBar
    bar: barHandle
  ReadFooBarWriteBazzz
    foo: fooHandle
    bar: barHandle
    bazzz: bazzzHandle
  ReadQuxWriteBazzz
    qux: quxHandle
    bazzz: bazzzHandle
    `;
    await assertFailure(bazzzRecipeStr('2d'));  // f1's maxAge is 1 day.
    await assertSuccess(bazzzRecipeStr('20h'));
  }));

  it('fails generating kotlin plans with derived data capabilities verification', Flags.withDefaultReferenceMode(async () => {
      const recipeStr = (bazzzPersistence) => `
recipe MyRecipe
  fooHandle: create 'foos' @inMemory @ttl('10h')
  barHandle: create 'bar' @persistent @ttl('2d')
  bazHandle: create 'baz' @inMemory @ttl('10h')
  bazzzHandle: create 'bazzz' @persistent @ttl('10h')
  WriteFoo
    foo: fooHandle
  WriteBar
    bar: barHandle
  ReadFooWriteBaz
    foo: fooHandle
    baz: bazHandle
  ReadFooBarWriteBazzz
    foo: fooHandle
    bar: barHandle
    bazzz: bazzzHandle
      `;
      // Foo.f2 'inMemory' is not compatible for ingress with 'onDisk'
      await assertFailure(recipeStr('persistent'));
      // Bar.br1 'onDisk' is not compatible for ingress with 'inMemory'
      await assertFailure(recipeStr('inMemory'));
  }));
});
