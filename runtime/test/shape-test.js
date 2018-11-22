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
import {Shape} from '../ts-build/shape.js';
import {Type} from '../ts-build/type.js';
import {Manifest} from '../ts-build/manifest.js';
import {TypeChecker} from '../ts-build/recipe/type-checker.js';
import {Schema} from '../ts-build/schema.js';


describe('shape', function() {
  it('finds type variable references in handles', function() {
    const shape = new Shape('Test', [{type: Type.newVariable({name: 'a'})}], []);
    assert.lengthOf(shape.typeVars, 1);
    assert.equal(shape.typeVars[0].field, 'type');
    assert.equal(shape.typeVars[0].object[shape.typeVars[0].field].variable.name, 'a');
  });

  it('finds type variable references in slots', function() {
    const shape = new Shape('Test', [], [{name: Type.newVariable({name: 'a'})}]);
    assert.lengthOf(shape.typeVars, 1);
    assert.equal(shape.typeVars[0].field, 'name');
    assert.equal(shape.typeVars[0].object[shape.typeVars[0].field].variable.name, 'a');
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
    assert.lengthOf(shape.typeVars, 4);
    let type = Type.newInterface(shape);
    const map = new Map();
    type = type.mergeTypeVariablesByName(map);
    assert(map.has('a'));
    assert(map.has('b'));
    shape = type.interfaceShape;
    assert.strictEqual(shape.handles[0].name.variable, shape.slots[0].name.variable);
    assert.strictEqual(shape.handles[1].type, shape.handles[2].type.collectionType);
  });

  it('matches particleSpecs', async () => {
    const manifest = await Manifest.parse(`
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
      const type = Type.newEntity(manifest.schemas.Test);
      const shape = new Shape('Test', [{name: 'foo'}, {direction: 'in'}, {type}], []);
      assert(!shape.particleMatches(manifest.particles[0]));
      assert(shape.particleMatches(manifest.particles[1]));
      assert(shape.particleMatches(manifest.particles[2]));
      assert(shape.particleMatches(manifest.particles[3]));
  });

  it('matches particleSpecs with slots', async () => {
    const manifest = await Manifest.parse(`
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
      const type = Type.newEntity(manifest.schemas.Test);
      const shape = new Shape('Test', [{direction: 'in', type}], [{name: 'one'}, {direction: 'provide', isSet: true}]);

      assert(!shape.particleMatches(manifest.particles[0]));
      assert(!shape.particleMatches(manifest.particles[1]));
      assert(shape.particleMatches(manifest.particles[2]));
      assert(shape.particleMatches(manifest.particles[3]));
  });

  it('Cannot ensure resolved an unresolved type variable', () => {
    const shape = new Shape('Test', [{type: Type.newVariable({name: 'a'})}], []);
    assert.isFalse(shape.canEnsureResolved());
  });

  it('Can ensure resolved a schema type', () => {
    const type = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    const shape = new Shape('Test', [{name: 'foo'}, {direction: 'in'}, {type}], []);
    assert.isTrue(shape.canEnsureResolved());
    assert.isTrue(shape.maybeEnsureResolved());
  });

  it('Maybe ensure resolved does not mutate on failure', () => {
    const constrainedType1 = TypeChecker.processTypeList(
      Type.newVariable({name: 'a'}),
      [{
        type: Type.newEntity(new Schema({names: ['Thing'], fields: {}})),
        direction: 'in'
      }]
    );
    const constrainedType2 = TypeChecker.processTypeList(
      Type.newVariable({name: 'b'}),
      [{
        type: Type.newEntity(new Schema({names: ['Thing'], fields: {}})),
        direction: 'out'
      }]
    );
    const unconstrainedType = Type.newVariable({name: 'c'});
    const allTypes = [constrainedType1, constrainedType2, unconstrainedType];

    const allTypesShape = new Shape('Test', [
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

    const constrainedOnlyShape = new Shape('Test', [
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

  it('restricted type constrains type variables in the recipe', async () => {
    const manifest = await Manifest.parse(`
      particle Transformer
        in [~a] input
        out [~a] output

      shape HostedShape
        in ~a *

      particle Multiplexer
        host HostedShape hostedParticle
        in [~a] items

      recipe
        use as items
        create as transformed
        Transformer
          input = items
          output = transformed
        Multiplexer
          items = transformed

      schema Burrito
      particle BurritoDisplayer
        in Burrito burrito
    `);

    const recipe = manifest.recipes[0];

    recipe.normalize();

    const burritoDisplayer = manifest.findParticleByName('BurritoDisplayer');
    const multiplexer = recipe.particles.find(p => p.name === 'Multiplexer');

    // Initially handle type are unresolvable type variables.
    assert.lengthOf(recipe.handles, 2);
    for (const handle of recipe.handles) {
      const collectionType = handle.type.collectionType;
      const resolved = collectionType.resolvedType();
      assert.isTrue(resolved.isVariable);
      assert.isFalse(resolved.canEnsureResolved());
    }

    const hostedParticleType = multiplexer.connections['hostedParticle'].type;
    assert.isTrue(!!hostedParticleType.interfaceShape.restrictType(burritoDisplayer));

    // After restricting the shape, handle types are constrainted to a Burrito.
    assert.lengthOf(recipe.handles, 2);
    for (const handle of recipe.handles) {
      const collectionType = handle.type.collectionType;
      const resolved = collectionType.resolvedType();
      assert.isTrue(collectionType.isVariable);
      assert.isTrue(resolved.canEnsureResolved());
      const canWriteSuperset = resolved.canWriteSuperset;
      assert.isTrue(canWriteSuperset.isEntity);
      assert.equal(canWriteSuperset.entitySchema.name, 'Burrito');
    }
  });

  it('allows checking whether particle matches a shape', async () => {
    const manifest = await Manifest.parse(`
      schema Thing
      schema Instrument extends Thing
      schema Guitar extends Instrument
      schema Gibson extends Guitar
      schema LesPaul extends Gibson

      particle Lower
        in Instrument input

      particle Upper
        out Gibson output

      shape HostedShape
        inout ~a *
      particle Host
        host HostedShape hosted
        inout ~a item

      recipe
        create as item
        Lower
          input = item
        Upper
          output = item
        Host
          item = item

      particle ThingCandidate
        inout Thing thingy
      particle InstrumentCandidate
        inout Instrument instrument
      particle GuitarCandidate
        inout Guitar guitar
      particle GibsonCandidate
        inout Gibson gibson
      particle LesPaulCandidate
        inout LesPaul lp
    `);

    const recipe = manifest.recipes[0];
    recipe.normalize();

    const hostParticle = recipe.particles.find(p => p.name === 'Host');
    const hostedShape = hostParticle.connections['hosted'].type.interfaceShape;

    const check = name => hostedShape.particleMatches(manifest.findParticleByName(name));

    // inout Thing is not be compatible with in Instrument input
    // inout LesPaul is not be compatible with out Gibson output
    // Remaining 3 candidates are compatible with Lower and Upper particles.
    assert.isFalse(check('ThingCandidate'));
    assert.isTrue(check('InstrumentCandidate'));
    assert.isTrue(check('GuitarCandidate'));
    assert.isTrue(check('GibsonCandidate'));
    assert.isFalse(check('LesPaulCandidate'));

    assert.isTrue(!!hostedShape.restrictType(
        manifest.findParticleByName('GuitarCandidate')));

    // After restricting the type with inout Guitar,
    // inout Instrument and inout Gibson are no longer viable matches.
    assert.isFalse(check('ThingCandidate'));
    assert.isFalse(check('InstrumentCandidate'));
    assert.isTrue(check('GuitarCandidate'));
    assert.isFalse(check('GibsonCandidate'));
    assert.isFalse(check('LesPaulCandidate'));
  });
});
