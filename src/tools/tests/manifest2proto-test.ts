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
import {capabilitiesToProtoOrdinals, encodeManifestToProto, manifestToProtoPayload, typeToProtoPayload} from '../manifest2proto.js';
import {CountType, EntityType, SingletonType, TupleType, Type} from '../../runtime/type.js';
import {Manifest} from '../../runtime/manifest.js';
import {Capabilities} from '../../runtime/capabilities.js';
import {fs} from '../../platform/fs-web.js';
import protobuf from 'protobufjs';

const rootNamespace = protobuf.loadSync('./java/arcs/core/data/proto/manifest.proto');
const manifestProto = rootNamespace.lookupType('arcs.ManifestProto');
const typeProto = rootNamespace.lookupType('arcs.TypeProto');
const CAPABILITY_ENUM = rootNamespace.lookupEnum('arcs.Capability');

describe('manifest2proto', () => {

  // The tests below construct the JSON representation equivalent to the proto,
  // construct the proto object from the constructed JSON and produce JSON back
  // from the proto object. This ensures that all JSON produced fits the
  // expectations of the protobufjs library and the shape of the proto declaration.
  async function toProtoAndBack(manifest: Manifest) {
    return manifestProto.fromObject(await manifestToProtoPayload(manifest)).toJSON();
  }
  async function toProtoAndBackType(type: Type) {
    return typeProto.fromObject(await typeToProtoPayload(type)).toJSON();
  }

  it('encodes a recipe with use, map, create handles, ids and tags', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        a: reads X {a: Text}
        b: reads Y {b: Number}
        c: writes Z {c: Boolean}

      recipe
        a: use #tag1 #tag2
        b: map 'by-id'
        c: create persistent
        Abc
          a: a
          b: b
          c: c
    `);
    const recipe = (await toProtoAndBack(manifest)).recipes[0];
    assert.deepEqual(recipe.handles[0].type.entity.schema.names, ['X']);
    assert.deepEqual(recipe.handles[1].type.entity.schema.names, ['Y']);
    assert.deepEqual(recipe.handles[2].type.entity.schema.names, ['Z']);

    // Clear the type so that the test is more readable. Tests for types encoding below.
    for (const handle of recipe.handles) {
      delete handle.type;
    }
    assert.deepStrictEqual(recipe, {
      handles: [{
        fate: 'USE',
        name: 'handle0',
        tags: ['tag1', 'tag2']
      }, {
        fate: 'MAP',
        id: 'by-id',
        name: 'handle1',
      }, {
        fate: 'CREATE',
        name: 'handle2',
        capabilities: ['PERSISTENT']
      }],
      particles: [{
        specName: 'Abc',
        connections: [{
          handle: 'handle0',
          name: 'a'
        }, {
          handle: 'handle1',
          name: 'b'
        }, {
          handle: 'handle2',
          name: 'c'
        }]
      }]
    });
  });

  it('encodes handle capabilities', () => {
    function capabilitiesToStrings(capabilities: Capabilities) {
      return capabilitiesToProtoOrdinals(capabilities).map(ordinal => CAPABILITY_ENUM.valuesById[ordinal]);
    }

    assert.deepEqual(capabilitiesToStrings(Capabilities.empty), []);
    assert.deepEqual(capabilitiesToStrings(Capabilities.tiedToArc), ['TIED_TO_ARC']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.tiedToRuntime), ['TIED_TO_RUNTIME']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.persistent), ['PERSISTENT']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.queryable), ['QUERYABLE']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.persistentQueryable), ['PERSISTENT', 'QUERYABLE']);
  });

  it('encodes handle joins', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        data: reads [(
          &Person {name: Text},
          &Place {address: Text},
        )]
      recipe
        people: use 'folks' #tag1
        pairs: join (people, places)
        places: map 'locations'
        Foo
          data: reads pairs
    `);
    const recipe = (await toProtoAndBack(manifest)).recipes[0];

    // Clear the type so that the test is more readable. Tests for types encoding below.
    for (const handle of recipe.handles) {
      delete handle.type;
    }
    assert.deepStrictEqual(recipe, {
      handles: [{
        fate: 'JOIN',
        name: 'handle0',
        associatedHandles: ['handle1', 'handle2']
      }, {
        fate: 'USE',
        name: 'handle1',
        id: 'folks',
        tags: ['tag1'],
      }, {
        fate: 'MAP',
        name: 'handle2',
        id: 'locations'
      }],
      particles: [{
        specName: 'Foo',
        connections: [{
          handle: 'handle0',
          name: 'data'
        }]
      }]
    });
  });

  it('encodes particle spec', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads X {a: Text}
    `);
    assert.deepStrictEqual(await toProtoAndBack(manifest), {
      particleSpecs: [{
        connections: [{
          direction: 'READS',
          name: 'input',
          type: {
            entity: {
              schema: {
                fields: {
                  a: {
                    primitive: 'TEXT'
                  }
                },
                hash: 'eb8597be8b72862d5580f567ab563cefe192508d',
                names: ['X']
              }
            }
          }
        }],
        location: 'a/b/c.js',
        name: 'Abc'
      }]
    });
  });

  it('encodes handle connection reads, writes and reads-writes', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads X {a: Text}
        output: writes Y {b: Number}
        state: reads writes Z {c: Boolean}
    `);
    const connections = (await toProtoAndBack(manifest)).particleSpecs[0].connections;
    assert.deepStrictEqual(connections.map(hc => hc.direction), ['READS', 'WRITES', 'READS_WRITES']);
  });

  it('encodes entity type', async () => {
    const entity = EntityType.make(['Foo'], {value: 'Text'});
    assert.deepStrictEqual(await toProtoAndBackType(entity), {
      entity: {
        schema: {
          names: ['Foo'],
          fields: {
            value: {
              primitive: 'TEXT'
            }
          },
          hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0',
        }
      }
    });
  });

  it('encodes entity type with simple refinement', async () => {
    const manifest = await Manifest.parse(`
        particle Foo
            input: reads Something {num: Number} [true]
    `);
    assert.deepStrictEqual(await toProtoAndBackType(manifest.particles[0].connections[0].type), {
      entity: {
        schema: {
          names: ['Something'],
          fields: {
            num: {
              primitive: 'NUMBER'
            }
          },
          hash: '6f1753a75cd024be11593acfbf34d1b92463e9ef',
        },
      },
      refinement: {
        boolean: true
      },
    });
  });

  it('encodes entity type with nested refinement', async () => {
    const manifest = await Manifest.parse(`
        particle Foo
            input: reads Something {num: Number} [num / 2 < 6 and num  > -1]
    `);
    const entity = manifest.particles[0].connections[0].type;
    assert.deepStrictEqual(await toProtoAndBackType(entity), {
      entity: {
        schema: {
          names: ['Something'],
          fields: {
            num: {
              primitive: 'NUMBER'
            }
          },
          hash: '6f1753a75cd024be11593acfbf34d1b92463e9ef',
        },
      },
      refinement: {
        binary: {
          leftExpr: {
            binary: {
              leftExpr: {
                field: 'num',
              },
              operator: 'LESS_THAN',
              rightExpr: {
                number: 12
              }
            }
          },
          operator: 'AND',
          rightExpr: {
            binary: {
              leftExpr: {
                field: 'num'
              },
              operator: 'GREATER_THAN',
              rightExpr: {
                number: -1
              }
            }
          },
        }
      }
    });
  });

  it('encodes entity type with query', async () => {
    const manifest = await Manifest.parse(`
        particle Foo
            input: reads Something {num: Number} [num == ?]
    `);
    const entity = manifest.particles[0].connections[0].type;
    assert.deepStrictEqual(await toProtoAndBackType(entity), {
      entity: {
        schema: {
          names: ['Something'],
          fields: {
            num: {
              primitive: 'NUMBER'
            }
          },
          hash: '6f1753a75cd024be11593acfbf34d1b92463e9ef',
        },
      },
      refinement: {
        binary: {
          leftExpr: {
            field: 'num'
          },
          operator: 'EQUALS',
          rightExpr: {
            queryArgument: '?'
          },
        }
      }
    });
  });
  it('encodes collection type', async () => {
    const collection = EntityType.make(['Foo'], {value: 'Text'}).collectionOf();
    assert.deepStrictEqual(await toProtoAndBackType(collection), {
      collection: {
        collectionType: {
          entity: {
            schema: {
              names: ['Foo'],
              fields: {
                value: {
                  primitive: 'TEXT'
                }
              },
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0',
            }
          }
        }
      }
    });
  });

  it('encodes reference type', async () => {
    const reference = EntityType.make(['Foo'], {value: 'Text'}).referenceTo();
    assert.deepStrictEqual(await toProtoAndBackType(reference), {
      reference: {
        referredType: {
          entity: {
            schema: {
              names: ['Foo'],
              fields: {
                value: {
                  primitive: 'TEXT'
                }
              },
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0',
            }
          }
        }
      }
    });
  });

  it('encodes singleton type', async () => {
    const singleton = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    assert.deepStrictEqual(await toProtoAndBackType(singleton), {
      singleton: {
        singletonType: {
          entity: {
            schema: {
              names: ['Foo'],
              fields: {
                value: {
                  primitive: 'TEXT'
                }
              },
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0',
            }
          }
        }
      }
    });
  });

  it('encodes tuple types', async () => {
    const first = EntityType.make(['Foo'], {value: 'Text'});
    const second = EntityType.make(['Bar'], {value: 'Number'});
    const tuple = new TupleType([first, second]);
    assert.deepStrictEqual(await toProtoAndBackType(tuple), {
      tuple: {
        elements: [
          {
            entity: {
              schema: {
                names: ['Foo'],
                fields: {
                  value: {
                    primitive: 'TEXT'
                  }
                },
                hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
              }
            }
          },
          {
            entity: {
              schema: {
                names: ['Bar'],
                fields: {
                  value: {
                    primitive: 'NUMBER'
                  }
                },
                hash: 'f0b9f39c14d12e1445ac70bbd28b65c0b9d30022'
              }
            }
          }
        ]
      }
    });
  });

  it('encodes count type', async () => {
    const singletonOfCount = new SingletonType(new CountType());
    assert.deepStrictEqual(await toProtoAndBackType(singletonOfCount), {
      singleton: {
        singletonType: {
          count: {}
        }
      }
    });
  });

  it('encodes schemas with primitives and collections of primitives', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads X Y Z {
          a: Text,
          b: Number,
          c: Boolean,
          d: [Text],
          e: [Number]
        }
    `);
    const schema = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type.entity.schema;

    assert.deepStrictEqual(schema.names, ['X', 'Y', 'Z']);
    assert.deepStrictEqual(schema.fields, {
      a: {primitive: 'TEXT'},
      b: {primitive: 'NUMBER'},
      c: {primitive: 'BOOLEAN'},
      d: {collection: {collectionType: {primitive: 'TEXT'}}},
      e: {collection: {collectionType: {primitive: 'NUMBER'}}}
    });
  });

  it('encodes schemas with entity references', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads {
          a: &Product {name: Text},
          b: [&Review {rating: Number}]
        }
    `);
    const schema = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type.entity.schema;

    assert.deepStrictEqual(schema.fields, {
      a: {reference: {referredType: {entity: {schema: {
        names: ['Product'],
        fields: {
          name: {primitive: 'TEXT'}
        },
        hash: 'a76bdd3a638fc17a5b3e023edb542c1e891c4c89'
      }}}}},
      b: {collection: {collectionType: {reference: {referredType: {entity: {schema: {
        names: ['Review'],
        fields: {
          rating: {primitive: 'NUMBER'},
        },
        hash: '2d3317e5ef54fbdf3fbc02ed481c2472ebe9ba66'
      }}}}}}},
    });
  });

  it('encodes schemas with tuple fields', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        t: (Text, Number)
      particle Abc in 'a/b/c.js'
        input: reads Foo 
    `);
    const schema = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type.entity.schema;

    assert.deepStrictEqual(schema.names, ['Foo']);
    assert.deepStrictEqual(schema.fields, {
      t: {tuple: {elements: [{primitive: 'TEXT'}, {primitive: 'NUMBER'}]}}
    });
  });

  it('encodes particle spec with semanticTag claims', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        private: writes {name: Text}
        public: writes {name: Text}
        claim private is private_tag
        claim public is not private_tag
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].claims, [
      {
        assume: {
          accessPath: {
            handleConnection: 'private'
          },
          predicate: {
            label: {
              semanticTag: 'private_tag'
            }
          }
        }
      },
      {
        assume: {
          accessPath: {
            handleConnection: 'public'
          },
          predicate: {
            not: {
              predicate: {
                label: {
                  semanticTag: 'private_tag'
                }
              }
            }
          }
        }
      }]);

  });

  it('encodes particle spec with derivesFrom claims', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        input: reads {name: Text}
        output: writes {name: Text}
        dontcare: writes {name: Text}
        claim output derives from input
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].claims, [
      {
        derivesFrom: {
          source: {
            handleConnection: 'input'
          },
          target: {
            handleConnection: 'output'
          }
        }
      }
    ]);
  });

  it('encodes particle spec with derivesFrom and hasTag claims', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        input: reads {name: Text}
        output: writes {name: Text}
        dontcare: writes {name: Text}
        claim output derives from input and is public
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].claims, [
      {
        derivesFrom: {
          source: {
            handleConnection: 'input'
          },
          target: {
            handleConnection: 'output'
          }
        }
      },
      {
        assume: {
          accessPath: {
            handleConnection: 'output'
          },
          predicate: {
            label: {
              semanticTag: 'public'
            }
          }
        }
      },
    ]);
  });

  // On the TypeScript side we serialize .arcs file and validate it equals the .pb.bin file.
  // On the Kotlin side we deserialize .pb.bin and validate it equals deserialized .textproto file.
  // This ensures that at least all the constructs used in the .arcs file can be serialized in TS
  // and deserialized in Kotlin to the extent that they are present in the .textproto file.
  it('encodes the Manifest2ProtoTest manifest', async () => {
    assert.deepStrictEqual(
      await encodeManifestToProto('java/arcs/core/data/testdata/Manifest2ProtoTest.arcs'),
      fs.readFileSync('java/arcs/core/data/testdata/Manifest2ProtoTest.pb.bin'),
      `The output of manifest2proto for Manifest2ProtoTest.arcs does not match the expectation.\n
If you want to update the expected output please run:\n
$ tools/sigh manifest2proto --outfile java/arcs/core/data/testdata/Manifest2ProtoTest.pb.bin java/arcs/core/data/testdata/Manifest2ProtoTest.arcs\n\n`);
  });
});
