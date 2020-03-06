/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {BigCollectionType, CollectionType, EntityType, HandleType, InterfaceType,
        ReferenceType, TupleType, SlotType, Type, TypeVariable, TypeVariableInfo} from '../type.js';
import {Entity} from '../entity.js';
import {Refinement} from '../refiner.js';
import {UnaryExpressionNode, FieldNode, Op} from '../manifest-ast-nodes.js';

// For reference, this is a list of all the types and their contained data:
//   EntityType        : Schema
//   TypeVariable      : TypeVariableInfo
//   CollectionType    : Type
//   BigCollectionType : Type
//   TupleType         : [Type]
//   InterfaceType     : InterfaceInfo
//   SlotType          : SlotInfo
//   ReferenceType     : Type
//   ArcType           : none
//   HandleType        : none

describe('types', () => {
  describe('literals and cloning', () => {
    // Ignore undefined fields.
    function deepEqual(a, b) {
      assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
    }

    it('Entity', async () => {
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      deepEqual(entity.toLiteral(), {
        tag: 'Entity',
        data: {names: ['Foo'], fields: {value: {kind: 'schema-primitive', refinement: null, type: 'Text'}}, refinement: null, description: {}}
      });
      deepEqual(entity, Type.fromLiteral(entity.toLiteral()));
      deepEqual(entity, entity.clone(new Map()));
    });

    it('Entity', async () => {
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
          type: 'Text'
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
        data: {name: 'a', canWriteSuperset: null, canReadSubset: null}
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
      const col3      = new CollectionType(reference);
      deepEqual(col3.toLiteral(), {tag: 'Collection', data: reference.toLiteral()});
      deepEqual(col3, Type.fromLiteral(col3.toLiteral()));
      deepEqual(col3, col3.clone(new Map()));
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

    it('HandleInfo', async () => {
      const handleInfo = new HandleType();
      deepEqual(handleInfo.toLiteral(), {tag: 'Handle'});
      deepEqual(handleInfo, Type.fromLiteral(handleInfo.toLiteral()));
      deepEqual(handleInfo, handleInfo.clone(new Map()));
    });

    it('combine all the types', async () => {
      const slot       = SlotType.make('f', 'h');
      const bigCol     = new BigCollectionType(slot);
      const reference  = new ReferenceType(bigCol);

      const entity     = EntityType.make(['Foo'], {value: 'Text'});
      const variable   = TypeVariable.make('a');
      const iface      = InterfaceType.make('i', [{type: entity, direction: 'any'}, {type: variable, direction: 'any'}], []);

      const handleInfo = new HandleType();

      const tuple   = new TupleType([reference, iface, handleInfo]);
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
  });

  describe('serialization', () => {
    it('serializes interfaces', async () => {
      const entity = EntityType.make(['Foo'], {value: 'Text'});
      const variable = TypeVariable.make('a');
      const iface = InterfaceType.make('i', [{type: entity, name: 'foo'}, {type: variable}], [{name: 'x', direction: 'consumes'}]);
      assert.strictEqual(iface.interfaceInfo.toString(),
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
      assert.strictEqual(iface.interfaceInfo.toString(),
`interface i
  ~a
`);
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
      recipe.handles[0].mapToStorage({
        id: 'test1',
        type: Entity.createEntityClass(manifest.findSchemaByName('Product'), null).type.collectionOf()
      });
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.lengthOf(recipe.handles, 1);
      assert.strictEqual((recipe.handles[0].type.getContainedType() as EntityType).entitySchema.name, 'Product');
    });

    it('a subtype matches to a supertype that wants to be read when a handle exists', async () => {
      const manifest = await Manifest.parse(manifestText);
      const recipe = manifest.recipes[1];
      recipe.handles[0].mapToStorage({
        id: 'test1',
        type: Entity.createEntityClass(manifest.findSchemaByName('Lego'), null).type.collectionOf()
      });
      assert(recipe.normalize());
      assert(recipe.isResolved());
      assert.lengthOf(recipe.handles, 1);
      assert.strictEqual((recipe.handles[0].type.getContainedType() as EntityType).entitySchema.name, 'Lego');
    });
  });
});
