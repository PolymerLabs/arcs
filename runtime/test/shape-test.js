/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {Shape} from '../shape.js';
import {Type} from '../type.js';
import {Manifest} from '../manifest.js';
import {TypeChecker} from '../recipe/type-checker.js';
import {Schema} from '../schema.js';


describe('shape', function() {
  it('finds type variable references in handles', function() {
    let shape = new Shape('Test', [{type: Type.newVariable({name: 'a'})}], []);
    assert.equal(shape._typeVars.length, 1);
    assert.equal(shape._typeVars[0].field, 'type');
    assert.equal(shape._typeVars[0].object[shape._typeVars[0].field].variable.name, 'a');
  });

  it('finds type variable references in slots', function() {
    let shape = new Shape('Test', [], [{name: Type.newVariable({name: 'a'})}]);
    assert.equal(shape._typeVars.length, 1);
    assert.equal(shape._typeVars[0].field, 'name');
    assert.equal(shape._typeVars[0].object[shape._typeVars[0].field].variable.name, 'a');
  });

  it('upgrades type variable references', function() {
    let shape = new Shape('Test',
      [
        {name: Type.newVariable({name: 'a'})},
        {type: Type.newVariable({name: 'b'}), name: 'singleton'},
        {type: Type.newVariable({name: 'b'}).collectionOf(), name: 'set'}
      ],
      [
        {name: Type.newVariable({name: 'a'})},
      ]);
    assert.equal(shape._typeVars.length, 4);
    let type = Type.newInterface(shape);
    let map = new Map();
    type = type.mergeTypeVariablesByName(map);
    assert(map.has('a'));
    assert(map.has('b'));
    shape = type.interfaceShape;
    assert.strictEqual(shape.handles[0].name.variable, shape.slots[0].name.variable);
    assert.strictEqual(shape.handles[1].type, shape.handles[2].type.collectionType);
  });

  it('matches particleSpecs', async () => {
    let manifest = await Manifest.parse(`
        schema Test
        schema NotTest

        particle P
          in Test foo

        particle Q
          in Test foo
          in Test foo2
          in Test foo3

        particle R
          out NotTest foo
          in NotTest bar
          out Test far

        particle S
          in NotTest bar
          out Test far
          out NotTest foo
      `);
      let type = Type.newEntity(manifest.schemas.Test);
      let shape = new Shape('Test', [{name: 'foo'}, {direction: 'in'}, {type}], []);
      assert(!shape.particleMatches(manifest.particles[0]));
      assert(shape.particleMatches(manifest.particles[1]));
      assert(shape.particleMatches(manifest.particles[2]));
      assert(shape.particleMatches(manifest.particles[3]));
  });

  it('matches particleSpecs with slots', async () => {
    let manifest = await Manifest.parse(`
        schema Test

        particle P
          in Test foo

        particle Q
          in Test foo
          consume one

        particle R
          in Test foo
          consume one
            provide set of other

        particle S
          in Test foo
          consume notTest
            provide one
            provide set of randomSlot
      `);
      let type = Type.newEntity(manifest.schemas.Test);
      let shape = new Shape('Test', [{direction: 'in', type}], [{name: 'one'}, {direction: 'provide', isSet: true}]);

      assert(!shape.particleMatches(manifest.particles[0]));
      assert(!shape.particleMatches(manifest.particles[1]));
      assert(shape.particleMatches(manifest.particles[2]));
      assert(shape.particleMatches(manifest.particles[3]));
  });

  it('Cannot ensure resolved an unresolved type variable', () => {
    let shape = new Shape('Test', [{type: Type.newVariable({name: 'a'})}], []);
    assert.isFalse(shape.canEnsureResolved());
  });

  it('Can ensure resolved a schema type', () => {
    let type = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    let shape = new Shape('Test', [{name: 'foo'}, {direction: 'in'}, {type}], []);
    assert.isTrue(shape.canEnsureResolved());
    assert.isTrue(shape.maybeEnsureResolved());
  });

  it('Maybe ensure resolved does not mutate on failure', () => {
    let constrainedType1 = TypeChecker.processTypeList(
      Type.newVariable({name: 'a'}),
      [{
        type: Type.newEntity(new Schema({names: ['Thing'], fields: {}})),
        direction: 'in'
      }]
    );
    let constrainedType2 = TypeChecker.processTypeList(
      Type.newVariable({name: 'b'}),
      [{
        type: Type.newEntity(new Schema({names: ['Thing'], fields: {}})),
        direction: 'out'
      }]
    );
    let unconstrainedType = Type.newVariable({name: 'c'});
    let allTypes = [constrainedType1, constrainedType2, unconstrainedType];

    let allTypesShape = new Shape('Test', [
      {type: constrainedType1},
      {type: unconstrainedType},
      {type: constrainedType2},
    ], []);
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isFalse(allTypesShape.canEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isFalse(allTypesShape.maybeEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()),
        'Types should not have been modified by a failed maybeEnsureResolved()');

    let constrainedOnlyShape = new Shape('Test', [
      {type: constrainedType1},
      {type: constrainedType2},
    ], []);
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isTrue(constrainedOnlyShape.canEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isTrue(constrainedOnlyShape.maybeEnsureResolved());
    assert.isTrue(constrainedType1.isResolved());
    assert.isTrue(constrainedType2.isResolved());
  });
});
