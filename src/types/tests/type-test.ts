/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {BigCollectionType, CollectionType, EntityType, HandleType, InterfaceType, ReferenceType,
        TupleType, SlotType, Type, TypeVariable, TypeVariableInfo, MuxType, Refinement} from '../lib-types.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {Entity} from '../../runtime/entity.js';
import {UnaryExpressionNode, FieldNode, Op} from '../../runtime/manifest-ast-types/manifest-ast-nodes.js';
import {Schema} from '../lib-types.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {StoreInfo} from '../../runtime/storage/store-info.js';

// For reference, this is a list of all the types and their contained data:
//   EntityType        : Schema
//   TypeVariable      : TypeVariableInfo
//   CollectionType    : Type
//   BigCollectionType : Type
//   TupleType         : [Type]
//   InterfaceType     : InterfaceInfo
//   SlotType          : SlotInfo
//   ReferenceType     : Type
//   MuxType           : Type
//   ArcType           : none
//   HandleType        : none

describe('types', () => {
  describe('literals and cloning', () => {
    // Ignore undefined fields.
    function deepEqual(a, b) {
      assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
    }

    it('Entity', () => {
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      deepEqual(entity.toLiteral(), {
        tag: 'Entity',
        data: {names: ['Foo'], fields: {value: {kind: 'schema-primitive', refinement: null, type: 'Text', annotations: []}}, refinement: null, annotations: [], description: {}}
      });
      deepEqual(entity, Type.fromLiteral(entity.toLiteral()));
      deepEqual(entity, entity.clone(new Map()));
    });

    it('Entity with refinement', () => {
      const ref = Refinement.fromAst({
        kind: 'refinement',
        location: null,
        expression: {
          kind: 'binary-expression-node',
          location: null,
          leftExpr: {
            kind: 'field-name-node',
            value: 'a',
            location: null,
          } as FieldNode,
          rightExpr: {
            kind: 'field-name-node',
            value: 'b',
            location: null,
          } as FieldNode,
          operator: Op.AND
        }}, {'a': 'Boolean', 'b': 'Boolean'});
      // tslint:disable-next-line: no-any
      const entity = EntityType.make(['Foo'], {
        value: {
          kind: 'schema-primitive',
          refinement: Refinement.fromAst({
            kind: 'refinement',
            expression: {
              kind: 'unary-expression-node',
              expr: {
                kind: 'field-name-node',
                value: 'value',
                location: null,
              } as FieldNode,
              operator: Op.NOT,
              location: null,
            } as UnaryExpressionNode,
            location: null
          }, {'value': 'Boolean'}),
          type: 'Text',
          annotations: [],
        }},
        {refinement: ref}
      );
      deepEqual(entity.toLiteral(), {
        tag: 'Entity',
        data: {
          names: ['Foo'],
          refinement: {
            kind: 'refinement',
            expression: {
              kind: 'BinaryExpressionNode',
              leftExpr: {
                kind: 'FieldNamePrimitiveNode',
                value: 'a',
                evalType: 'Boolean'
              },
              rightExpr: {
                kind: 'FieldNamePrimitiveNode',
                value: 'b',
                evalType: 'Boolean'
              },
              operator: Op.AND,
              evalType: 'Boolean'
            }
          },
          fields: {
            value: {
              annotations: [],
              kind: 'schema-primitive',
              refinement: {
                kind: 'refinement',
                expression: {
                  kind: 'UnaryExpressionNode',
                  expr: {
                    kind: 'FieldNamePrimitiveNode',
                    value: 'value',
                    evalType: 'Boolean'
                  },
                  operator: Op.NOT,
                  evalType: 'Boolean'
                }
              },
              type: 'Text'
            }
          },
          annotations: [],
          description: {}
        }
      });
      deepEqual(entity, Type.fromLiteral(entity.toLiteral()));
      deepEqual(entity, entity.clone(new Map()));
    });

    it('TypeVariable', async () => {
      const variable = TypeVariable.make('a');
      deepEqual(variable.toLiteral(), {
        tag: 'TypeVariable',
        data: {name: 'a', canWriteSuperset: null, canReadSubset: null, resolveToMaxType: false}
      });
      deepEqual(variable, Type.fromLiteral(variable.toLiteral()));
      deepEqual(variable, variable.clone(new Map()));
    });

    it('Collection', async () => {
      // Collection of entities
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const col1   = new CollectionType(entity);
      deepEqual(col1.toLiteral(), {tag: 'Collection', data: entity.toLiteral()});
      deepEqual(col1, Type.fromLiteral(col1.toLiteral()));
      deepEqual(col1, col1.clone(new Map()));

      // Collection of collection of variables
      const variable = TypeVariable.make('a');
      const inner    = new CollectionType(variable);
      const col2     = new CollectionType(inner);
      deepEqual(col2.toLiteral(), {
        tag: 'Collection',
        data: {tag: 'Collection', data: variable.toLiteral()}
      });
      deepEqual(col2, Type.fromLiteral(col2.toLiteral()));
      deepEqual(col2, col2.clone(new Map()));

      // Collection of references to slots
      const slot      = SlotType.make('f', 'h');
      const reference = new ReferenceType(slot);
      const col4      = new CollectionType(reference);
      deepEqual(col4.toLiteral(), {tag: 'Collection', data: reference.toLiteral()});
      deepEqual(col4, Type.fromLiteral(col4.toLiteral()));
      deepEqual(col4, col4.clone(new Map()));
    });

    it('BigCollection', async () => {
      // BigCollection of entities
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const big1   = new BigCollectionType(entity);
      deepEqual(big1.toLiteral(), {tag: 'BigCollection', data: entity.toLiteral()});
      deepEqual(big1, Type.fromLiteral(big1.toLiteral()));
      deepEqual(big1, big1.clone(new Map()));

      // BigCollection of BigCollection of variables
      const variable = TypeVariable.make('a');
      const inner    = new BigCollectionType(variable);
      const big2     = new BigCollectionType(inner);
      deepEqual(big2.toLiteral(), {
        tag: 'BigCollection',
        data: {tag: 'BigCollection', data: variable.toLiteral()}
      });
      deepEqual(big2, Type.fromLiteral(big2.toLiteral()));
      deepEqual(big2, big2.clone(new Map()));

      // BigCollection of references to slots
      const slot      = SlotType.make('f', 'h');
      const reference = new ReferenceType(slot);
      const big3      = new BigCollectionType(reference);
      deepEqual(big3.toLiteral(), {tag: 'BigCollection', data: reference.toLiteral()});
      deepEqual(big3, Type.fromLiteral(big3.toLiteral()));
      deepEqual(big3, big3.clone(new Map()));
    });

    it('Tuple', async () => {
      const entity   = EntityType.make(['Foo'], {value: 'Text'});
      const variable = TypeVariable.make('a');
      const col      = new CollectionType(entity);
      const tuple = new TupleType([entity, variable, col]);
      deepEqual(tuple.toLiteral(), {
        tag: 'Tuple',
        data: [entity.toLiteral(), variable.toLiteral(), col.toLiteral()]
      });
      deepEqual(tuple, Type.fromLiteral(tuple.toLiteral()));
      deepEqual(tuple, tuple.clone(new Map()));
    });

    it('Interface', async () => {
      const entity   = EntityType.make(['Foo'], {value: 'Text'});
      const variable = TypeVariable.make('a');
      const col      = new CollectionType(entity);
      const iface    = InterfaceType.make('i', [{type: entity, direction: 'any'}, {type: variable, direction: 'any'}, {type: col, direction: 'any'}], [{name: 'x'}]);
      deepEqual(iface.toLiteral(), {
        tag: 'Interface',
        data: {
          name: 'i',
          handleConnections: [{type: entity.toLiteral(), direction: 'any'}, {type: variable.toLiteral(), direction: 'any'}, {type: col.toLiteral(), direction: 'any'}],
          slots: [{name: 'x'}]
        }
      });
      deepEqual(iface, Type.fromLiteral(iface.toLiteral()));
      deepEqual(iface, iface.clone(new Map()));
    });

    it('Slot', async () => {
      const slot = SlotType.make('f', 'h');
      deepEqual(slot.toLiteral(), {tag: 'Slot', data: {formFactor: 'f', handle: 'h'}});
      deepEqual(slot, Type.fromLiteral(slot.toLiteral()));
      deepEqual(slot, slot.clone(new Map()));
    });

    it('Reference', async () => {
      // Reference to entity
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const ref1   = new ReferenceType(entity);
      deepEqual(ref1.toLiteral(), {tag: 'Reference', data: entity.toLiteral()});
      deepEqual(ref1, Type.fromLiteral(ref1.toLiteral()));
      deepEqual(ref1, ref1.clone(new Map()));

      // Reference to reference variable
      const variable = TypeVariable.make('a');
      const inner    = new ReferenceType(variable);
      const ref2     = new ReferenceType(inner);
      deepEqual(ref2.toLiteral(), {
        tag: 'Reference',
        data: {tag: 'Reference', data: variable.toLiteral()}
      });
      deepEqual(ref2, Type.fromLiteral(ref2.toLiteral()));
      deepEqual(ref2, ref2.clone(new Map()));

      // Reference to collection of slots
      const slot = SlotType.make('f', 'h');
      const col = new CollectionType(slot);
      const ref3 = new ReferenceType(col);
      deepEqual(ref3.toLiteral(), {tag: 'Reference', data: col.toLiteral()});
      deepEqual(ref3, Type.fromLiteral(ref3.toLiteral()));
      deepEqual(ref3, ref3.clone(new Map()));
    });

    it('Mux', async () => {
      // MuxType of an entity
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const mux1 = new MuxType(entity);
      deepEqual(mux1.toLiteral(), {tag: 'Mux', data: entity.toLiteral()});
      deepEqual(mux1, Type.fromLiteral(mux1.toLiteral()));
      deepEqual(mux1, mux1.clone(new Map()));

      // MuxType of a reference variable
      const variable = TypeVariable.make('a');
      const inner = new ReferenceType(variable);
      const mux2 = new MuxType(inner);
      deepEqual(mux2.toLiteral(), {
        tag: 'Mux',
        data: {tag: 'Reference', data: variable.toLiteral()}
      });
      deepEqual(mux2, Type.fromLiteral(mux2.toLiteral()));
      deepEqual(mux2, mux2.clone(new Map()));

      // MuxType of a collection of slots
      const slot = SlotType.make('f', 'h');
      const col = new CollectionType(slot);
      const mux3 = new MuxType(col);
      deepEqual(mux3.toLiteral(), {tag: 'Mux', data: col.toLiteral()});
      deepEqual(mux3, Type.fromLiteral(mux3.toLiteral()));
      deepEqual(mux3, mux3.clone(new Map()));
    });

    it('HandleInfo', async () => {
      const handleInfo = new HandleType();
      deepEqual(handleInfo.toLiteral(), {tag: 'Handle', data: {}});
      deepEqual(handleInfo, Type.fromLiteral(handleInfo.toLiteral()));
      deepEqual(handleInfo, handleInfo.clone(new Map()));
    });

    it('combine all the types', async () => {
      const slot       = SlotType.make('f', 'h');
      const bigCol     = new BigCollectionType(slot);
      const reference  = new ReferenceType(bigCol);
      const muxType = new MuxType(reference);

      const entity     = EntityType.make(['Foo'], {value: 'Text'});
      const variable   = TypeVariable.make('a');
      const iface      = InterfaceType.make('i', [{type: entity, direction: 'any'}, {type: variable, direction: 'any'}], []);

      const handleInfo = new HandleType();

      const tuple   = new TupleType([muxType, iface, handleInfo]);
      const collection = new CollectionType(tuple);

      deepEqual(collection, Type.fromLiteral(collection.toLiteral()));
      deepEqual(collection, collection.clone(new Map()));
    });
  });

  describe('TypeVariable', () => {
    const resolutionAssertMsg = 'variable cannot resolve to collection of itself';

    it(`setting the resolution to itself is a no-op`, () => {
      const a = TypeVariable.make('x');
      a.variable.resolution = a;
      assert.isNull(a.variable.resolution);
    });

    it(`allows 2 type variables to resolve to each other`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      a.variable.resolution = b;
      b.variable.resolution = a;

      assert.strictEqual(a.resolvedType(), b.resolvedType());
    });

    it(`allows the resolution to be a Collection of other type variable`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      a.variable.resolution = b.collectionOf();
    });

    it(`allows the resolution to be a BigCollection of other type variable`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      a.variable.resolution = b.bigCollectionOf();
    });

    it(`disallows the resolution to be a Collection of itself`, () => {
      const a = TypeVariable.make('x');
      assert.throws(() => a.variable.resolution = a.collectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution to be a BigCollection of itself`, () => {
      const a = TypeVariable.make('x');
      assert.throws(() => a.variable.resolution = a.bigCollectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a Collection of type variable that resolve to x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a;
      assert.throws(() => a.variable.resolution = b.collectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a BigCollection of type variable that resolve to x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a;
      assert.throws(() => a.variable.resolution = b.bigCollectionOf(), resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a type variable that resolves to Collection of x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a.collectionOf();
      assert.throws(() => a.variable.resolution = b, resolutionAssertMsg);
    });

    it(`disallows the resolution of x to be a type variable that resolves to BigCollection of x`, () => {
      const a = TypeVariable.make('x');
      const b = TypeVariable.make('x');
      b.variable.resolution = a.bigCollectionOf();
      assert.throws(() => a.variable.resolution = b, resolutionAssertMsg);
    });

    it(`maybeEnsureResolved clears canReadSubset and canWriteSuperset`, () => {
      const a = new TypeVariableInfo('x');
      const b = EntityType.make(['Thing'], {});

      a.maybeMergeCanWriteSuperset(b);

      assert.strictEqual(a.canWriteSuperset, b);
      assert.notExists(a.canReadSubset);
      assert.notExists(a.resolution);

      a.maybeEnsureResolved();

      assert.notExists(a.canWriteSuperset);
      assert.notExists(a.canReadSubset);
      assert.strictEqual(a.resolution, b);
    });
    it(`maybeEnsureResolved prefers canReadSubset for resolution when resolveToMaxType is true`, () => {
      const sup = EntityType.make(['Super'], {});
      const sub = EntityType.make(['Sub'], {});
      const a = new TypeVariableInfo('x', sup, sub, true);

      a.maybeEnsureResolved();

      assert.notExists(a.canWriteSuperset);
      assert.notExists(a.canReadSubset);
      assert.strictEqual(a.resolution, sub);
    });
    it(`maybeEnsureResolved prefers canWriteSuperset for resolution when resolveToMaxType is false`, () => {
      const sup = EntityType.make(['Super'], {});
      const sub = EntityType.make(['Sub'], {});
      const a = new TypeVariableInfo('x', sup, sub, false);

      a.maybeEnsureResolved();

      assert.notExists(a.canWriteSuperset);
      assert.notExists(a.canReadSubset);
      assert.strictEqual(a.resolution, sup);
    });
    it(`successfully restricts full type ranges`, () => {
      const varInfo1 = new TypeVariableInfo('x',
          new EntityType(new Schema(['Foo'], {a: 'Text'})),
          new EntityType(new Schema(['Foo'], {a: 'Text', b: 'Text', c: 'Text', d: 'Text'})));
      const varInfo2 = new TypeVariableInfo('y',
          new EntityType(new Schema(['Foo'], {a: 'Text', b: 'Text'})),
          new EntityType(new Schema(['Foo'], {a: 'Text', b: 'Text', d: 'Text', e: 'Text'})));
      const validateResult = (result) => {
        assert.equal(result._canWriteSuperset.toString(), 'Foo {a: Text, b: Text}');
        assert.equal(result._canReadSubset.toString(), 'Foo {a: Text, b: Text, d: Text}');
      };
      validateResult(varInfo1.restrictTypeRanges(varInfo2));
      validateResult(varInfo2.restrictTypeRanges(varInfo1));

      // set resolution in one of the variable infos.
      assert.isTrue(varInfo1.maybeEnsureResolved());
      validateResult(varInfo1.restrictTypeRanges(varInfo2));
      validateResult(varInfo2.restrictTypeRanges(varInfo1));

      // set resolution in another variable info.
      assert.isTrue(varInfo2.maybeEnsureResolved());
      validateResult(varInfo1.restrictTypeRanges(varInfo2));
      validateResult(varInfo2.restrictTypeRanges(varInfo1));
    });
    it(`successfully restricts partial type ranges`, () => {
      const varInfo1 = new TypeVariableInfo('x', new EntityType(new Schema(['Foo'], {a: 'Text'})));
      const varInfo2 = new TypeVariableInfo('y',
          null,
          new EntityType(new Schema(['Foo'], {a: 'Text', b: 'Text', d: 'Text', e: 'Text'})));

      // variable info with an empty range.
      const varInfo3 = new TypeVariableInfo('x');
      const result1 = varInfo1.restrictTypeRanges(varInfo3);
      assert.equal(result1._canWriteSuperset.toString(), varInfo1._canWriteSuperset.toString());
      assert.isUndefined(result1._canReadSubset);

      const result2 = varInfo3.restrictTypeRanges(varInfo2);
      assert.isUndefined(result2._canWriteSuperset);
      assert.equal(result2._canReadSubset.toString(), varInfo2._canReadSubset.toString());

      const validateResult = (result) => {
        assert.equal(result._canWriteSuperset.toString(), 'Foo {a: Text}');
        assert.equal(result._canReadSubset.toString(), 'Foo {a: Text, b: Text, d: Text, e: Text}');
      };
      validateResult(varInfo1.restrictTypeRanges(varInfo2));
      validateResult(varInfo2.restrictTypeRanges(varInfo1));

      // set resolution in one of the variable infos.
      assert.isTrue(varInfo1.maybeEnsureResolved());
      validateResult(varInfo1.restrictTypeRanges(varInfo2));
      validateResult(varInfo2.restrictTypeRanges(varInfo1));

      // set resolution in another variable info.
      assert.isTrue(varInfo2.maybeEnsureResolved());
      validateResult(varInfo1.restrictTypeRanges(varInfo2));
      validateResult(varInfo2.restrictTypeRanges(varInfo1));
    });
    it(`fails restricting type ranges - no union`, () => {
      const varInfo1 = new TypeVariableInfo('x', new EntityType(new Schema(['Foo'], {a: 'Text'})));
      const varInfo2 = new TypeVariableInfo('y', new EntityType(new Schema(['Foo'], {a: 'Number'})));
      assert.throws(() => varInfo1.restrictTypeRanges(varInfo2),
          'Cannot union schemas: Foo {a: Text} and Foo {a: Number}');
    });
    it(`fails restricting type ranges - incompatible bounds`, () => {
      const varInfo1 = new TypeVariableInfo('x',
          new EntityType(new Schema(['Foo'], {a: 'Text'})),
          new EntityType(new Schema(['Foo'], {a: 'Text'})));
      const varInfo2 = new TypeVariableInfo('y',
          new EntityType(new Schema(['Foo'], {b: 'Text'})),
          new EntityType(new Schema(['Foo'], {b: 'Text'})));
      assert.isNull(varInfo1.restrictTypeRanges(varInfo2));
      assert.throws(() => new TypeVariable(varInfo1).restrictTypeRanges(new TypeVariable(varInfo2)),
          'Cannot restrict type ranges of [Foo {a: Text} - Foo {a: Text}] and [Foo {b: Text} - Foo {b: Text}]');
    });
  });

  describe('serialization', () => {
    it('serializes interfaces', async () => {
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const variable = TypeVariable.make('a');
      const iface = InterfaceType.make('i', [{type: entity, name: 'foo'}, {type: variable}], [{name: 'x', direction: 'consumes'}]);
      assert.strictEqual(iface.interfaceInfo.toManifestString(),
`interface i
  foo: Foo {value: Text}
  ~a
  x: consumes? Slot`);
    });

    // Regression test for https://github.com/PolymerLabs/arcs/issues/2575
    it('disregards type variable resolutions in interfaces', async () => {
      const variable = TypeVariable.make('a');
      variable.variable.resolution = EntityType.make(['Foo'], {value: 'Text'});
      const iface = InterfaceType.make('i', [{type: variable}], []);
      assert.strictEqual(iface.interfaceInfo.toManifestString(),
`interface i
  ~a`);
    });
  });

  describe('integration', () => {
    const manifestText = `
      schema Product
        name: Text

      schema Lego extends Product
        setId: Text

      particle WritesLego
        lego: writes [Lego]

      particle ReadsProduct
        product: reads [Product]

      recipe MatchBasic
        v0: create *
        WritesLego
          lego: writes v0
        ReadsProduct
          product: reads v0

      recipe MatchExisting
        v0: use 'test:1'
        WritesLego
          lego: writes v0
        ReadsProduct
          product: reads v0`;

    it('a subtype matches to a supertype that wants to be read', async () => {
      const manifest = await Manifest.parse(manifestText);
      const recipe = manifest.recipes[0];
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.strictEqual(recipe.handles.length, 1);
      assert.strictEqual((recipe.handles[0].type.getContainedType().canReadSubset as EntityType).entitySchema.name, 'Lego');
      assert.strictEqual((recipe.handles[0].type.getContainedType().canWriteSuperset as EntityType).entitySchema.name, 'Product');
    });

    it('a subtype matches to a supertype that wants to be read when a handle exists', async () => {
      const manifest = await Manifest.parse(manifestText);
      const recipe = manifest.recipes[1];
      recipe.handles[0].mapToStorage(new StoreInfo({
        id: 'test1',
        type: Entity.createEntityClass(manifest.findSchemaByName('Product'), null).type.collectionOf()
      }));
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.lengthOf(recipe.handles, 1);
      assert.strictEqual((recipe.handles[0].type.getContainedType() as EntityType).entitySchema.name, 'Product');
    });

    it('a subtype matches to a supertype that wants to be read when a handle exists', async () => {
      const manifest = await Manifest.parse(manifestText);
      const recipe = manifest.recipes[1];
      recipe.handles[0].mapToStorage(new StoreInfo({
        id: 'test1',
        type: Entity.createEntityClass(manifest.findSchemaByName('Lego'), null).type.collectionOf()
      }));
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.lengthOf(recipe.handles, 1);
      assert.strictEqual((recipe.handles[0].type.getContainedType() as EntityType).entitySchema.name, 'Lego');
    });
  });

  it('merges type variables by name and preserves merging in clones', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        a: reads ~x with {a: Text}
        b: reads [~x with {b: Text}]
        c: reads BigCollection<~x with {c: Text}>
        d: writes &~x with {d: Text}
        e: writes (~x with {e: Text})
        f: writes ![~x with {f: Text}]
        g: reads #~x with {g: Text}
    `);
    const original = manifest.particles[0];
    const clone = original.clone();
    for (const particle of [original, clone]) {
      const aType = particle.connections.find(hc => hc.name === 'a').type;
      aType.maybeEnsureResolved();
      assert.hasAllKeys(aType.resolvedType().getEntitySchema().fields, [
        'a', 'b', 'c', 'd', 'e', 'f', 'g'
      ]);
    }
  });
});
