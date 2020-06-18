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
import {CountType, EntityType, SingletonType, TupleType, Type, TypeVariable} from '../../runtime/type.js';
import {Manifest} from '../../runtime/manifest.js';
import {Capabilities, Shareable, Persistence, Queryable} from '../../runtime/capabilities.js';
import {fs} from '../../platform/fs-web.js';
import {CapabilityEnum, ManifestProto, TypeProto} from '../manifest-proto.js';
import {Loader} from '../../platform/loader.js';
import {assertThrowsAsync} from '../../testing/test-util.js';

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
      return capabilitiesToProtoOrdinals(capabilities).map(ordinal => CapabilityEnum.valuesById[ordinal]);
    }

    assert.deepEqual(capabilitiesToStrings(Capabilities.create()), []);
    assert.deepEqual(capabilitiesToStrings(Capabilities.create([new Shareable(false)])), ['TIED_TO_ARC']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.create([new Shareable(true)])), ['TIED_TO_RUNTIME']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.create([Persistence.onDisk()])), ['PERSISTENT']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.create([new Queryable(true)])), ['QUERYABLE']);
    assert.deepEqual(capabilitiesToStrings(Capabilities.create(
        [Persistence.onDisk(), new Queryable(true)])), ['PERSISTENT', 'QUERYABLE']);
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

  it('encodes variable type - writeSuperset constraint', async () => {
    const constraint = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    const varType = TypeVariable.make('a', constraint);
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {
        name: 'a',
        constraint: {constraintType: {
            singleton: {singletonType: {
                entity: {schema: {
                    names: ['Foo'],
                    fields: { value: { primitive: 'TEXT' } },
                    hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
                }}
            }},
        }}
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
          constraintType: {
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
                    hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
                  }
                }
              },
            },
          }
        }
      }
    });
  });

  it('encodes variable type - resolved constraint', async () => {
    const constraint = EntityType.make(['Foo'], {value: 'Text'}).singletonOf();
    const varType = TypeVariable.make('a', constraint, constraint);
    varType.maybeEnsureResolved();
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
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
              hash: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0'
            }
          }
        },
      },
    });
  });

  it('encodes variable type - unconstrained', async () => {
    const varType = TypeVariable.make('a');
    assert.deepStrictEqual(await toProtoAndBackType(varType), {
      variable: {
        name: 'a',
        constraint: {
          constraintType: {}
        }
      }
    });
  });

  it('encodes variable type for particle specs', async () => {
    const manifest = await Manifest.parse(`
    particle TimeRedactor
      input: reads ~a with {time: Number}
      output: writes ~a
    `);

    const particleSpec = (await toProtoAndBack(manifest)).particleSpecs[0];
    const varInput = particleSpec.connections.find(c => c.name == 'input').type.variable;
    const varOutput = particleSpec.connections.find(c => c.name == 'output').type.variable;

    assert.deepStrictEqual(varInput, varOutput);
    assert.deepStrictEqual(varInput.name, 'a');
    assert.deepStrictEqual(varInput.constraint, { constraintType: {
      entity: {
          schema: {
            fields: { time: {primitive: 'NUMBER'} },
            hash: '5c7ae2de06d2111eeef1a845d57d52e23ff214da',
          }
        }
      }
    });
  });

  it('encodes variable type for particle specs - unconstrained', async () => {
    const manifest = await Manifest.parse(`
    particle P
      input: reads ~a
      output: writes ~a
    `);

    const particleSpec = (await toProtoAndBack(manifest)).particleSpecs[0];
    const varInput = particleSpec.connections.find(c => c.name == 'input').type.variable;
    const varOutput = particleSpec.connections.find(c => c.name == 'output').type.variable;

    assert.deepStrictEqual(varInput, varOutput);
    assert.deepStrictEqual(varInput.name, 'a');
    assert.deepStrictEqual(varInput.constraint, { constraintType: {} });
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
      particle Abc in 'a/b/c.js'
        input: reads Foo {t: (Text, Number)}
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
            particleSpec: 'Test',
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
            particleSpec: 'Test',
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
            particleSpec: 'Test',
            handleConnection: 'input'
          },
          target: {
            particleSpec: 'Test',
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
            particleSpec: 'Test',
            handleConnection: 'input'
          },
          target: {
            particleSpec: 'Test',
            handleConnection: 'output'
          }
        }
      },
      {
        assume: {
          accessPath: {
            particleSpec: 'Test',
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
            particleSpec: 'Test',
            handleConnection: 'private',
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
            particleSpec: 'Test',
            handleConnection: 'private',
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
            particleSpec: 'Test',
            handleConnection: 'input',
            selectors: [{field: 'bar'}],
          },
          target: {
            particleSpec: 'Test',
            handleConnection: 'private',
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
          particleSpec: 'Test',
          handleConnection: 'private'
        },
        predicate: {
          label: {
            semanticTag: 'private_tag'
          }
        }
      },
      {
        accessPath: {
          particleSpec: 'Test',
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
          particleSpec: 'Test',
          handleConnection: 'private'
        },
        predicate: {
          label: {
            semanticTag: 'private_tag'
          }
        }
      },
      {
        accessPath: {
          particleSpec: 'Test',
          handleConnection: 'private',
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
          particleSpec: 'Test',
          handleConnection: 'public',
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
          particleSpec: 'Test',
          handleConnection: 'private'
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
          particleSpec: 'Test',
          handleConnection: 'public'
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
          particleSpec: 'Test',
          handleConnection: 'private'
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
          particleSpec: 'Test',
          handleConnection: 'public'
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
          particleSpec: 'Test',
          handleConnection: 'input1'
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
          particleSpec: 'Test',
          handleConnection: 'input2'
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
          particleSpec: 'Test',
          handleConnection: 'input3'
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
