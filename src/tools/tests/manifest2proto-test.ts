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
import {encodeManifestToProto, manifestToProtoPayload, typeToProtoPayload} from '../manifest2proto.js';
import {CountType, EntityType, SingletonType, TupleType, Type, TypeVariable} from '../../runtime/type.js';
import {Manifest} from '../../runtime/manifest.js';
import {fs} from '../../platform/fs-web.js';
import {ManifestProto, TypeProto} from '../manifest-proto.js';
import {Loader} from '../../platform/loader.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {deleteFieldRecursively} from '../../runtime/util.js';

describe('manifest2proto', () => {

  // The tests below construct the JSON representation equivalent to the proto,
  // construct the proto object from the constructed JSON and produce JSON back
  // from the proto object. This ensures that all JSON produced fits the
  // expectations of the protobufjs library and the shape of the proto declaration.
  async function toProtoAndBack(manifest: Manifest) {
    return ManifestProto.fromObject(await manifestToProtoPayload(manifest)).toJSON();
  }
  async function toProtoAndBackType(type: Type) {
    return TypeProto.fromObject(await typeToProtoPayload(type)).toJSON();
  }

  // Clear the type so that the test is more readable.
  function clearTypesForTests(recipe) {
    for (const handle of recipe.handles) {
      delete handle.type;
    }
    for (const particle of recipe.particles) {
      for (const connection of particle.connections) {
        delete connection.type;
      }
    }
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
        c: create @persistent
        Abc
          a: a
          b: b
          c: c
    `);
    const recipe = (await toProtoAndBack(manifest)).recipes[0];
    assert.deepEqual(recipe.handles[0].type.entity.schema.names, ['X']);
    assert.deepEqual(recipe.handles[1].type.entity.schema.names, ['Y']);
    assert.deepEqual(recipe.handles[2].type.entity.schema.names, ['Z']);

    clearTypesForTests(recipe);

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
        annotations: [{name: 'persistent'}]
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

  it('encodes handle joins', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        data: reads [(
          &Person {name: Text},
          &Place {address: Text},
        )]
        stats: writes [{address: Text, numPeople: Number}]
      recipe
        people: use 'folks' #tag1
        pairs: join (people, places)
        places: map 'locations'
        stats: create @persistent
        Foo
          data: reads pairs
          stats: writes stats
    `);
    const recipe = (await toProtoAndBack(manifest)).recipes[0];

    clearTypesForTests(recipe);

    assert.deepStrictEqual(recipe, {
      handles: [{
        fate: 'JOIN',
        name: 'handle0',
        associatedHandles: ['handle2', 'handle3']
      }, {
        fate: 'CREATE',
        name: 'handle1',
        annotations: [{
          name: 'persistent'
        }]
      }, {
        fate: 'USE',
        name: 'handle2',
        id: 'folks',
        tags: ['tag1'],
      }, {
        fate: 'MAP',
        name: 'handle3',
        id: 'locations'
      }],
      particles: [{
        specName: 'Foo',
        connections: [{
          handle: 'handle0',
          name: 'data'
        }, {
          handle: 'handle1',
          name: 'stats'
        }]
      }]
    });
  });

  it('encodes particle spec', async () => {
    const manifest = await Manifest.parse(`
      @isolated
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
        name: 'Abc',
        annotations: [{name: 'isolated'}],
      }]
    });
  });

  it('encodes particle spec with expressions', async () => {
    const manifest = await Manifest.parse(`
      particle FooBar
        bar: reads Y {b: Text}
        foo: writes X {a: Text} = new X {a: bar.b}
    `);
    assert.deepStrictEqual(await toProtoAndBack(manifest), {
      particleSpecs: [{
        connections: [{
          name: 'bar',
          direction: 'READS',
          type: {entity: {schema: {
            names: ['Y'],
            fields: {b: {primitive: 'TEXT'}},
            hash: '555c20b532deda21eb146d1909b9fb372ba583b2',
          }}}
        }, {
          name: 'foo',
          direction: 'WRITES',
          type: {entity: {schema: {
            names: ['X'],
            fields: {a: {primitive: 'TEXT'}},
            hash: 'eb8597be8b72862d5580f567ab563cefe192508d',
          }}},
          expression: 'expression-entity' // This is a temporary stop-gap.
        }],
        name: 'FooBar',
      }]
    });
  });

  it('encodes egress type in particle spec', async () => {
    const manifest = await Manifest.parse(`
      @egress('MyEgressType')
      particle Abc
    `);
    assert.deepStrictEqual(await toProtoAndBack(manifest), {
      particleSpecs: [{
        name: 'Abc',
        annotations: [{
          name: 'egress',
          params: [{
            name: 'type',
            strValue: 'MyEgressType',
          }]
        }],
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

  it('encodes particle instance handle connection concrete types', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        a: reads X {a: Text}
        b: reads Y {b: Number}
        c: writes Z {c: Boolean}

      recipe
        a: use #tag1 #tag2
        b: map 'by-id'
        c: create @persistent
        Abc
          a: a
          b: b
          c: c
    `);
    const connections = (await toProtoAndBack(manifest)).recipes[0].particles[0].connections;

    assert.deepStrictEqual(connections, [
      {
        handle: 'handle0',
        name: 'a',
        type: {entity: {schema: {
          names: ['X'],
          fields: {a: {primitive: 'TEXT'}},
          hash: 'eb8597be8b72862d5580f567ab563cefe192508d',
        }}}
      },
      {
        handle: 'handle1',
        name: 'b',
        type: {entity: {schema: {
          names: ['Y'],
          fields: {b: {primitive: 'NUMBER'}},
          hash: '19caf7b30005cfd9b03c7f96ae526dc49995105f',
        }}},
      },
      {
        handle: 'handle2',
        name: 'c',
        type: {entity: {schema: {
          names: ['Z'],
          fields: {c: {primitive: 'BOOLEAN'}},
          hash: 'e1ad5776554cda0ee2aad4c45dc0afda2ffc56b9',
        }}},
      }
    ]);
  });

  it('encodes recipe annotations', async () => {
    const manifest = await Manifest.parse(`
      policy MyPolicy {}

      @policy('MyPolicy')
      recipe Foo
    `);
    const recipe = (await toProtoAndBack(manifest)).recipes[0];

    assert.deepStrictEqual(recipe, {
      name: 'Foo',
      annotations: [{
        name: 'policy',
        params: [{
          name: 'name',
          strValue: 'MyPolicy',
        }]
      }]
    });
  });

  it('encodes variable particle instance types', async () => {
    const manifest = await Manifest.parse(`
      particle Writer1
        first: writes [Foo {a: Text, c: Text}]
        second: writes [Bar {a: Text, b: Text}]
      particle Writer2
        first: writes [Foo {a: Text, b: Text}]
        second: writes [Bar {a: Text, c: Text}]
      particle Reader1
        first: reads [~f with {a: Text}]
        second: reads [{}]
      particle Reader2
        first: reads [Foo {}]
        second: reads [~b]

      recipe
        h0: create
        h2: create
        Writer1
          first: h0
          second: h1
        Writer2
          first: h0
          second: h1
        Reader1
          first: h0
          second: h1
        Reader2
          first: h0
          second: h1
    `);
    const particles = (await toProtoAndBack(manifest)).recipes[0].particles;

    assert.deepStrictEqual(particles, [
      {
        specName: 'Reader1',
        connections: [
          {
            name: 'first',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Foo'],
              fields: {a: {primitive: 'TEXT'}},
              hash: 'f1ad402186d86434f807bf3f9281551ead306aa8',
            }}}}}
          },
          {
            name: 'second',
            handle: 'handle1',
            type: {collection: {collectionType: {entity: {schema: {hash: '42099b4af021e53fd8fd4e056c2568d7c2e3ffa8'}}}}}
          },
        ]
      },
      {
        specName: 'Reader2',
        connections: [
          {
            name: 'first',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Foo'],
              hash: 'ec8cd58dd81749ef65d1fd4f322d666d414e9a1c'
            }}}}}
          },
          {
            name: 'second',
            handle: 'handle1',
            type: {collection: {collectionType: {entity: {schema: {hash: '42099b4af021e53fd8fd4e056c2568d7c2e3ffa8'}}}}}
          },
        ]
      },
      {
        specName: 'Writer1',
        connections: [
          {
            name: 'first',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Foo'],
              fields: {a: {primitive: 'TEXT'}, c: {primitive: 'TEXT'}},
              hash: '08266b26520a746b944249ce1a6f3375e7480178'
            }}}}}
          },
          {
            name: 'second',
            handle: 'handle1',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Bar'],
              fields: {a: {primitive: 'TEXT'}, b: {primitive: 'TEXT'}},
              hash: 'cb189f1044b3f59bf13928fe759f5d72b5913c75'
            }}}}}
          },
        ]
      },
      {
        specName: 'Writer2',
        connections: [
          {
            name: 'first',
            handle: 'handle0',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Foo'],
              fields: {a: {primitive: 'TEXT'}, b: {primitive: 'TEXT'}},
              hash: 'c99bd43b5f6e012613062feb5152d073f2e8155d'
            }}}}}
          },
          {
            name: 'second',
            handle: 'handle1',
            type: {collection: {collectionType: {entity: {schema: {
              names: ['Bar'],
              fields: {a: {primitive: 'TEXT'}, c: {primitive: 'TEXT'}},
              hash: '68dc41439853353b2238470a84bdc2e9545838d8'
            }}}}}
          },
        ]
      },
    ]);
  });

  it('encodes entity type', async () => {
    const entity = EntityType.make(['Foo'], {value: 'Text'});
    assert.deepStrictEqual(await toProtoAndBackType(entity), {
      entity: {
        schema: {
          names: ['Foo'],
          fields: {value: {primitive: 'TEXT'}},
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
          fields: {num: {primitive: 'NUMBER'}},
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
          fields: {num: {primitive: 'NUMBER'}},
          hash: '6f1753a75cd024be11593acfbf34d1b92463e9ef',
        },
      },
      refinement: {
        binary: {
          leftExpr: {
            binary: {
              leftExpr: {field: 'num'},
              operator: 'GREATER_THAN',
              rightExpr: {number: -1},
            }
          },
          operator: 'AND',
          rightExpr: {
            binary: {
              leftExpr: {field: 'num'},
              operator: 'LESS_THAN',
              rightExpr: {number: 12},
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
          fields: {num: {primitive: 'NUMBER'}},
          hash: '6f1753a75cd024be11593acfbf34d1b92463e9ef',
        },
      },
      refinement: {
        binary: {
          leftExpr: {field: 'num'},
          operator: 'EQUALS',
          rightExpr: {queryArgument: '?'},
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
              fields: {value: {primitive: 'TEXT'}},
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
              fields: {value: {primitive: 'TEXT'}},
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
              fields: {value: {primitive: 'TEXT'}},
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
                fields: {value: {primitive: 'TEXT'}},
                hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
              }
            }
          },
          {
            entity: {
              schema: {
                names: ['Bar'],
                fields: {value: {primitive: 'NUMBER'}},
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

  it('encodes variable type - writeSuperset constraint', async () => {
    const constraint = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    const varType = TypeVariable.make('a', constraint);
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {
        name: 'a',
        constraint: {
          constraintType: {singleton: {singletonType: {
            entity: {schema: {
              names: ['Foo'],
              fields: {value: {primitive: 'TEXT'}},
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
            }}
          }}},
          unconstrained: false,
        }
      }
    });
  });

  it('encodes variable type - readSubset constraint', async () => {
    const constraint = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    const varType = TypeVariable.make('a', null, constraint);
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {
        name: 'a',
        constraint: {
          constraintType: {singleton: {singletonType: {
            entity: {schema: {
              names: ['Foo'],
              fields: {value: {primitive: 'TEXT'}},
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
            }}
          }}},
          unconstrained: false,
        }
      }
    });
  });

  it('encodes max variable type - writeSuperset constraint', async () => {
    const constraint = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    const varType = TypeVariable.make('a', constraint, null, true);
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {
        name: 'a',
        constraint: {
          constraintType: {singleton: {singletonType: {
            entity: {schema: {
              names: ['Foo'],
              fields: {value: {primitive: 'TEXT'}},
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
            }}
          }}},
          unconstrained: true,
        }
      }
    });
  });

  it('encodes max variable type - readSubset constraint', async () => {
    const constraint = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    const varType = TypeVariable.make('a', null, constraint, true);
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {
        name: 'a',
        constraint: {
          constraintType: {singleton: {singletonType: {
            entity: {schema: {
              names: ['Foo'],
              fields: {value: {primitive: 'TEXT'}},
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
            }}
          }}},
          unconstrained: true,
        }
      }
    });
  });

  it('encodes variable type - resolved constraint', async () => {
    const constraint = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    const varType = TypeVariable.make('a', constraint, constraint);
    varType.maybeEnsureResolved();
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      singleton: {singletonType: {
        entity: {schema: {
          names: ['Foo'],
          fields: {value: {primitive: 'TEXT'}},
          hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
        }}
      }}
    });
  });

  it('encodes variable type - unconstrained', async () => {
    const varType = TypeVariable.make('a');
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {name: 'a', constraint: {unconstrained: false}}
    });
  });

  it('encodes max variable type - unconstrained', async () => {
    const varType = TypeVariable.make('a', null, null, true);
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {name: 'a', constraint: {unconstrained: true}}
    });
  });

  it('encodes variable type for particle specs', async () => {
    const manifest = await Manifest.parse(`
    particle TimeRedactor
      input: reads ~a with {time: Number}
      output: writes ~a
    `);

    const particleSpec = (await toProtoAndBack(manifest)).particleSpecs[0];
    const varInput = particleSpec.connections.find(c => c.name === 'input').type.variable;
    const varOutput = particleSpec.connections.find(c => c.name === 'output').type.variable;

    assert.deepStrictEqual(varInput, varOutput);
    assert.deepStrictEqual(varInput.name, 'a');
    assert.deepStrictEqual(varInput.constraint, {
      constraintType: {
        entity: {schema: {
          fields: {time: {primitive: 'NUMBER'}},
          hash: '5c7ae2de06d2111eeef1a845d57d52e23ff214da',
        }}
      },
      unconstrained: false
    });
  });

  it('encodes max variable type for particle specs', async () => {
    const manifest = await Manifest.parse(`
    particle TimeRedactor
      input: reads ~a with {time: Number, *}
      output: writes ~a
    `);

    const particleSpec = (await toProtoAndBack(manifest)).particleSpecs[0];
    const varInput = particleSpec.connections.find(c => c.name === 'input').type.variable;
    const varOutput = particleSpec.connections.find(c => c.name === 'output').type.variable;

    assert.deepStrictEqual(varInput, varOutput);
    assert.deepStrictEqual(varInput.name, 'a');
    assert.deepStrictEqual(varInput.constraint, {
      constraintType: {
        entity: {schema: {
            fields: {time: {primitive: 'NUMBER'}},
            hash: '5c7ae2de06d2111eeef1a845d57d52e23ff214da',
        }}
      },
      unconstrained: true
    });
  });

  it('encodes variable type for particle specs - unconstrained', async () => {
    const manifest = await Manifest.parse(`
    particle P
      input: reads ~a
      output: writes ~a
    `);

    const particleSpec = (await toProtoAndBack(manifest)).particleSpecs[0];
    const varInput = particleSpec.connections.find(c => c.name === 'input').type.variable;
    const varOutput = particleSpec.connections.find(c => c.name === 'output').type.variable;

    assert.deepStrictEqual(varInput, varOutput);
    assert.deepStrictEqual(varInput.name, 'a');
    assert.isFalse(varInput.constraint.unconstrained);
    assert.isFalse(varOutput.constraint.unconstrained);
  });

  it('encodes max variable type for particle specs - unconstrained', async () => {
    const manifest = await Manifest.parse(`
    particle P
      input: reads ~a with {*}
      output: writes ~a
    `);

    const particleSpec = (await toProtoAndBack(manifest)).particleSpecs[0];
    const varInput = particleSpec.connections.find(c => c.name === 'input').type.variable;
    const varOutput = particleSpec.connections.find(c => c.name === 'output').type.variable;

    assert.deepStrictEqual(varInput, varOutput);
    assert.deepStrictEqual(varInput.name, 'a');
    assert.isTrue(varInput.constraint.unconstrained);
    assert.isTrue(varOutput.constraint.unconstrained);
  });

  it('encodes schemas with primitives and collections of primitives', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads X Y Z {
          txt: Text,
          num: Number,
          bool: Boolean,
          bigInt: BigInt,
          bt: Byte,
          shrt: Short,
          nt: Int,
          lng: Long,
          chr: Char,
          flt: Float,
          dbl: Double,
          txtSet: [Text],
          numSet: [Number],
        }
    `);
    const schema = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type.entity.schema;

    assert.deepStrictEqual(schema.names, ['X', 'Y', 'Z']);
    assert.deepStrictEqual(schema.fields, {
      txt: {primitive: 'TEXT'},
      num: {primitive: 'NUMBER'},
      bool: {primitive: 'BOOLEAN'},
      bigInt: {primitive: 'BIGINT'},
      bt: {primitive: 'BYTE'},
      shrt: {primitive: 'SHORT'},
      nt: {primitive: 'INT'},
      lng: {primitive: 'LONG'},
      chr: {primitive: 'CHAR'},
      flt: {primitive: 'FLOAT'},
      dbl: {primitive: 'DOUBLE'},
      txtSet: {collection: {collectionType: {primitive: 'TEXT'}}},
      numSet: {collection: {collectionType: {primitive: 'NUMBER'}}},
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
        fields: {name: {primitive: 'TEXT'}},
        hash: 'a76bdd3a638fc17a5b3e023edb542c1e891c4c89'
      }}}}},
      b: {collection: {collectionType: {reference: {referredType: {entity: {schema: {
        names: ['Review'],
        fields: {rating: {primitive: 'NUMBER'}},
        hash: '2d3317e5ef54fbdf3fbc02ed481c2472ebe9ba66'
      }}}}}}},
    });
  });

  it('encodes schemas with tuple fields', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads Foo {t: (Text, Number)}
    `);
    const schema = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type.entity.schema;

    assert.deepStrictEqual(schema.names, ['Foo']);
    assert.deepStrictEqual(schema.fields, {
      t: {tuple: {elements: [{primitive: 'TEXT'}, {primitive: 'NUMBER'}]}}
    });
  });

  it('encodes schemas with ordered list fields', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads Foo {l: List<Number>}
    `);
    const schema = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type.entity.schema;

    assert.deepStrictEqual(schema.names, ['Foo']);
    assert.deepStrictEqual(schema.fields, {
      l: {list: {elementType: {primitive: 'NUMBER'}}}
    });
  });

  it('encodes EntityType with inlined entity fields', async () => {
    const manifest = await Manifest.parse(`
      particle Abc in 'a/b/c.js'
        input: reads Foo {e: inline Bar {name: Text}}
    `);
    const type = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type;

    deleteFieldRecursively(type, 'hash');
    assert.deepStrictEqual(type, {
      entity: {
        schema: {
          names: ['Foo'],
          fields: {
            e: {
              entity: {
                inline: true,
                schema: {
                  names: ['Bar'],
                  fields: {
                    name: {primitive: 'TEXT'},
                  }
                }
              }
            }
          }
        }
      }
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
            handle: {
              particleSpec: 'Test',
              handleConnection: 'private'
            }
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
            handle: {
              particleSpec: 'Test',
              handleConnection: 'public'
            }
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
            handle: {
              particleSpec: 'Test',
              handleConnection: 'input'
            },
          },
          target: {
            handle: {
              particleSpec: 'Test',
              handleConnection: 'output'
            },
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
            handle: {
              particleSpec: 'Test',
              handleConnection: 'input'
            },
          },
          target: {
            handle: {
              particleSpec: 'Test',
              handleConnection: 'output'
            },
          }
        }
      },
      {
        assume: {
          accessPath: {
            handle: {
              particleSpec: 'Test',
              handleConnection: 'output'
            }
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

  it('encodes particle spec with field-level claims', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        input: reads {bar: Text}
        private: writes {name: Text, ref: &Foo {foo: Text}}
        claim private is private_tag
        claim private.ref.foo is not private_tag
        claim private.ref derives from input.bar
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].claims, [
      {
        assume: {
          accessPath: {
            handle: {
              particleSpec: 'Test',
              handleConnection: 'private',
            }
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
            handle: {
              particleSpec: 'Test',
              handleConnection: 'private',
            },
            selectors: [{field: 'ref'}, {field: 'foo'}],
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
      },
      {
        derivesFrom: {
          source: {
            handle: {
              particleSpec: 'Test',
              handleConnection: 'input',
            },
            selectors: [{field: 'bar'}],
          },
          target: {
            handle: {
              particleSpec: 'Test',
              handleConnection: 'private',
            },
            selectors: [{field: 'ref'}],
          },
        },
      }
    ]);
  });

  it('encodes particle spec with checkHasTag checks', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        private: reads {name: Text}
        public: reads {name: Text}
        check private is private_tag
        check public is not private_tag
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].checks, [
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'private'
          }
        },
        predicate: {
          label: {
            semanticTag: 'private_tag'
          }
        }
      },
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'public'
          }
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
      }]);
  });

  it('encodes particle spec with field-level checks', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        private: reads {name: Text, ref: &Foo {foo: Text}}
        public: reads {name: Text, ref: &Foo {foo: Text}}
        check private is private_tag
        check private.ref.foo is not private_tag
        check public.ref is public_tag
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].checks, [
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'private'
          },
        },
        predicate: {
          label: {
            semanticTag: 'private_tag'
          }
        }
      },
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'private',
          },
          selectors: [{field: 'ref'}, {field: 'foo'}],
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
      },
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'public',
          },
          selectors: [{field: 'ref'}],
        },
        predicate: {
          label: {
            semanticTag: 'public_tag'
          }
        }
      }]);
  });

  it('encodes particle spec with compound checks', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        private: reads {name: Text}
        public: reads {name: Text}
        check private is private_tag and is secret
        check public is public_tag or is not secret
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].checks, [
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'private'
          }
        },
        predicate: {
          and: {
            conjunct0: {
              label: {
                semanticTag: 'private_tag'
              }
            },
            conjunct1: {
              label: {
                semanticTag: 'secret'
              }
            }
          }
        }
      },
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'public'
          }
        },
        predicate: {
          or: {
            disjunct0: {
              label: {
                semanticTag: 'public_tag'
              }
            },
            disjunct1: {
              not: {
                predicate: {
                  label: {
                    semanticTag: 'secret'
                  }
                }
              }
            }
          }
        }
      }]);
  });

  it('encodes particle spec with compound checks (>2 children)', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        private: reads {name: Text}
        public: reads {name: Text}
        check private is private_tag and is secret and is something
        check public is public_tag or (is secret and is something)
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].checks, [
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'private'
          }
        },
        predicate: {
          and: {
            conjunct0: {
              and: {
                conjunct0: {
                  label: {
                    semanticTag: 'private_tag'
                  }
                },
                conjunct1: {
                  label: {
                    semanticTag: 'secret'
                  }
                }
              }
            },
            conjunct1: {
              label: {
                semanticTag: 'something'
              }
            }
          }
        }
      },
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'public'
          }
        },
        predicate: {
          or: {
            disjunct0: {
              label: {
                semanticTag: 'public_tag'
              }
            },
            disjunct1: {
              and: {
                conjunct0: {
                  label: {
                    semanticTag: 'secret'
                  }
                },
                conjunct1: {
                  label: {
                    semanticTag: 'something'
                  }
                }
              }
            }
          }
        }
      }]);
  });

  it('encodes particle spec with implication checks', async () => {
    const manifest = await Manifest.parse(`
      particle Test in 'a/b/c.js'
        input1: reads {name: Text}
        input2: reads {name: Text}
        input3: reads {name: Text}
        check input1 (is private => is trusted)
        check input2 (is private => (is trusted => is bespoke))
        check input3 ((is private => is trusted) => is bespoke)
     `);
    const spec = await toProtoAndBack(manifest);
    assert.deepStrictEqual(spec.particleSpecs[0].checks, [
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'input1'
          }
        },
        predicate: {
          implies: {
            antecedent: {label: {semanticTag: 'private'}},
            consequent: {label: {semanticTag: 'trusted'}},
          },
        },
      },
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'input2'
          }
        },
        predicate: {
          implies: {
            antecedent: {label: {semanticTag: 'private'}},
            consequent: {
              implies: {
                antecedent: {label: {semanticTag: 'trusted'}},
                consequent: {label: {semanticTag: 'bespoke'}},
              },
            },
          },
        },
      },
      {
        accessPath: {
          handle: {
            particleSpec: 'Test',
            handleConnection: 'input3'
          }
        },
        predicate: {
          implies: {
            antecedent: {
              implies: {
                antecedent: {label: {semanticTag: 'private'}},
                consequent: {label: {semanticTag: 'trusted'}},
              },
            },
            consequent: {label: {semanticTag: 'bespoke'}},
          },
        },
      },
    ]);
  });

  it('supports imports in .arcs files', async () => {
    const loader = new Loader(null, {
      '/a.arcs': `
        particle ParticleA
          foo: writes Person {name: Text}
      `,
      '/b.arcs': `
        particle ParticleB
          bar: reads Person {name: Text}
      `,
      '/c.arcs': `
        import './a.arcs'
        import './b.arcs'

        recipe R
          h: create
          ParticleA
            foo: h
          ParticleB
            bar: h
      `,
    });
    const manifest = await Manifest.load('/c.arcs', loader);
    const data = await toProtoAndBack(manifest);
    const recipe = data.recipes[0];
    const particleSpecs = data.particleSpecs;
    assert.deepStrictEqual(recipe.particles.map(p => p.specName), ['ParticleA', 'ParticleB']);
    assert.deepStrictEqual(particleSpecs.map(p => p.name), ['ParticleA', 'ParticleB']);
  });

  it('rejects duplicate definitions in imported .arcs files', async () => {
    const loader = new Loader(null, {
      '/a.arcs': `
        particle Dupe
          foo: reads Person {}
      `,
      '/b.arcs': `
        particle Dupe
          foo: reads Person {}
      `,
      '/c.arcs': `
        import './a.arcs'
        import './b.arcs'

        recipe R
          h: create
          Dupe
            foo: h
      `,
    });
    const manifest = await Manifest.load('/c.arcs', loader);
    await assertThrowsAsync(
        async () => toProtoAndBack(manifest),
        `Duplicate definition of particle named 'Dupe'.`);
  });

  it('encodes externally defined schemas', async () => {
    const manifest = await Manifest.parse(`
      schema Manufacturer
        address: Text

      schema Size
        length: Number

      schema Product
        name: Text
        manufacturer: &Manufacturer
        size: inline Size

      particle Abc in 'a/b/c.js'
        input: reads Product
    `);
    const type = (await toProtoAndBack(manifest)).particleSpecs[0].connections[0].type;

    assert.deepStrictEqual(type, {
      entity: {schema: {
        names: ['Product'],
        fields: {
          name: {primitive: 'TEXT'},
          manufacturer: {reference: {referredType: {entity: {schema: {
              names: ['Manufacturer'],
              fields: {address: {primitive: 'TEXT'}},
              hash: 'd61bcba2419ded8a1b497fc6d905b372baafce01',
            }}}}
          },
          size: {entity: {
            schema: {
              names: ['Size'],
              fields: {length: {primitive: 'NUMBER'}},
              hash: '597828c0a7769319fb9a468b599da4fd3b01ee4d',
            },
            inline: true,
          }}
        },
        hash: 'd229c2b1aa361873e50d050705e47aa33bd1891b',
      }}
    });
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
