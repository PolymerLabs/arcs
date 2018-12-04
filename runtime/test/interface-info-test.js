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
import {InterfaceInfo} from '../ts-build/interface-info.js';
import {Type, EntityType, TypeVariable} from '../ts-build/type.js';
import {Manifest} from '../ts-build/manifest.js';
import {TypeChecker} from '../ts-build/recipe/type-checker.js';
import {Schema} from '../ts-build/schema.js';
import {TypeVariableInfo} from '../ts-build/type-variable-info.js';

describe('interface', function() {
  it('finds type variable references in handles', function() {
    const iface = new InterfaceInfo('Test', [{type: Type.newVariable(new TypeVariableInfo('a'))}], []);
    assert.lengthOf(iface.typeVars, 1);
    assert.equal(iface.typeVars[0].field, 'type');
    assert.equal(iface.typeVars[0].object[iface.typeVars[0].field].variable.name, 'a');
  });

  it('finds type variable references in slots', function() {
    const iface = new InterfaceInfo('Test', [], [{name: Type.newVariable(new TypeVariableInfo('a'))}]);
    assert.lengthOf(iface.typeVars, 1);
    assert.equal(iface.typeVars[0].field, 'name');
    assert.equal(iface.typeVars[0].object[iface.typeVars[0].field].variable.name, 'a');
  });

  it('upgrades type variable references', function() {
    let iface = new InterfaceInfo('Test',
      [
        {name: Type.newVariable(new TypeVariableInfo('a'))},
        {type: Type.newVariable(new TypeVariableInfo('b')), name: 'singleton'},
        {type: Type.newVariable(new TypeVariableInfo('b')).collectionOf(), name: 'set'}
      ],
      [
        {name: Type.newVariable(new TypeVariableInfo('a'))},
      ]);
    assert.lengthOf(iface.typeVars, 4);
    let type = Type.newInterface(iface);
    const map = new Map();
    type = type.mergeTypeVariablesByName(map);
    assert(map.has('a'));
    assert(map.has('b'));
    iface = type.interfaceInfo;
    assert.strictEqual(iface.handles[0].name.variable, iface.slots[0].name.variable);
    assert.strictEqual(iface.handles[1].type, iface.handles[2].type.collectionType);
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
      const iface = new InterfaceInfo('Test', [{name: 'foo'}, {direction: 'in'}, {type}], []);
      assert(!iface.particleMatches(manifest.particles[0]));
      assert(iface.particleMatches(manifest.particles[1]));
      assert(iface.particleMatches(manifest.particles[2]));
      assert(iface.particleMatches(manifest.particles[3]));
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
      const iface = new InterfaceInfo('Test',
        [{direction: 'in', type}],
        [{name: 'one'}, {direction: 'provide', isSet: true}]);

      assert(!iface.particleMatches(manifest.particles[0]));
      assert(!iface.particleMatches(manifest.particles[1]));
      assert(iface.particleMatches(manifest.particles[2]));
      assert(iface.particleMatches(manifest.particles[3]));
  });

  it('Cannot ensure resolved an unresolved type variable', () => {
    const iface = new InterfaceInfo('Test', [{type: Type.newVariable(new TypeVariableInfo('a'))}], []);
    assert.isFalse(iface.canEnsureResolved());
  });

  it('Can ensure resolved a schema type', () => {
    const type = Type.newEntity(new Schema({names: ['Thing'], fields: {}}));
    const iface = new InterfaceInfo('Test', [{name: 'foo'}, {direction: 'in'}, {type}], []);
    assert.isTrue(iface.canEnsureResolved());
    assert.isTrue(iface.maybeEnsureResolved());
  });

  it('Maybe ensure resolved does not mutate on failure', () => {
    const constrainedType1 = TypeChecker.processTypeList(
      Type.newVariable(new TypeVariableInfo('a')),
      [{
        type: Type.newEntity(new Schema({names: ['Thing'], fields: {}})),
        direction: 'in'
      }]
    );
    const constrainedType2 = TypeChecker.processTypeList(
      Type.newVariable(new TypeVariableInfo('b')),
      [{
        type: Type.newEntity(new Schema({names: ['Thing'], fields: {}})),
        direction: 'out'
      }]
    );
    const unconstrainedType = Type.newVariable(new TypeVariableInfo('c'));
    const allTypes = [constrainedType1, constrainedType2, unconstrainedType];

    const allTypesIface = new InterfaceInfo('Test',
      [{type: constrainedType1}, {type: unconstrainedType}, {type: constrainedType2}], []);
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isFalse(allTypesIface.canEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isFalse(allTypesIface.maybeEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()),
        'Types should not have been modified by a failed maybeEnsureResolved()');

    const constrainedOnlyIface = new InterfaceInfo('Test',
      [{type: constrainedType1}, {type: constrainedType2}], []);
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isTrue(constrainedOnlyIface.canEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isTrue(constrainedOnlyIface.maybeEnsureResolved());
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
      assert.isTrue(resolved instanceof TypeVariable);
      assert.isFalse(resolved.canEnsureResolved());
    }

    const hostedParticleType = multiplexer.connections['hostedParticle'].type;
    assert.isTrue(!!hostedParticleType.interfaceInfo.restrictType(burritoDisplayer));

    // After restricting the interface, handle types are constrainted to a Burrito.
    assert.lengthOf(recipe.handles, 2);
    for (const handle of recipe.handles) {
      const collectionType = handle.type.collectionType;
      const resolved = collectionType.resolvedType();
      assert.isTrue(collectionType instanceof TypeVariable);
      assert.isTrue(resolved.canEnsureResolved());
      const canWriteSuperset = resolved.canWriteSuperset;
      assert.isTrue(canWriteSuperset instanceof EntityType);
      assert.equal(canWriteSuperset.entitySchema.name, 'Burrito');
    }
  });

  it('allows checking whether particle matches an interface', async () => {
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
    const hostedInterface = hostParticle.connections['hosted'].type.interfaceInfo;

    const check = name => hostedInterface.particleMatches(manifest.findParticleByName(name));

    // inout Thing is not be compatible with in Instrument input
    // inout LesPaul is not be compatible with out Gibson output
    // Remaining 3 candidates are compatible with Lower and Upper particles.
    assert.isFalse(check('ThingCandidate'));
    assert.isTrue(check('InstrumentCandidate'));
    assert.isTrue(check('GuitarCandidate'));
    assert.isTrue(check('GibsonCandidate'));
    assert.isFalse(check('LesPaulCandidate'));

    assert.isTrue(!!hostedInterface.restrictType(manifest.findParticleByName('GuitarCandidate')));

    // After restricting the type with inout Guitar,
    // inout Instrument and inout Gibson are no longer viable matches.
    assert.isFalse(check('ThingCandidate'));
    assert.isFalse(check('InstrumentCandidate'));
    assert.isTrue(check('GuitarCandidate'));
    assert.isFalse(check('GibsonCandidate'));
    assert.isFalse(check('LesPaulCandidate'));
  });
});
