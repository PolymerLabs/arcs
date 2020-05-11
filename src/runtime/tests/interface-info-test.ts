/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {TypeChecker} from '../recipe/type-checker.js';
import {CollectionType, EntityType, InterfaceInfo, InterfaceType, Type, TypeVariable} from '../type.js';

describe('interface', () => {
  it('round trips interface info', async () => {
    const interfStr = `interface HostedInterface
  reads ~a
  name: writes Name {name: Text}
  root: consumes? Slot
  other: provides [Slot]`;
    const manifest = await Manifest.parse(interfStr);

    assert.lengthOf(manifest.interfaces, 1);
    const interf = manifest.interfaces[0];

    assert.strictEqual(interf.toString(), interfStr);
  });

  it('finds type variable references in handle connections', () => {
    const iface = InterfaceInfo.make('Test', [{type: TypeVariable.make('a')}], []);
    assert.lengthOf(iface.typeVars, 1);
    assert.strictEqual(iface.typeVars[0].field, 'type');
    assert.strictEqual(iface.typeVars[0].object[iface.typeVars[0].field].variable.name, 'a');
  });

  it('finds type variable references in slots', () => {
    const iface = InterfaceInfo.make('Test', [], [
      {name: TypeVariable.make('a'), direction: 'consumes', isRequired: false, isSet: false}]);
    assert.lengthOf(iface.typeVars, 1);
    assert.strictEqual(iface.typeVars[0].field, 'name');
    assert.strictEqual(iface.typeVars[0].object[iface.typeVars[0].field].variable.name, 'a');
  });

  it('upgrades type variable references', () => {
    let type = InterfaceType.make('Test',
      [
        {name: TypeVariable.make('a'), type: TypeVariable.make('aType')},
        {type: TypeVariable.make('b'), name: 'singleton', direction: 'any'},
        {type: TypeVariable.make('b').collectionOf(), name: 'set'}
      ],
      [
        {name: TypeVariable.make('a')},
      ]);
    assert.lengthOf(type.interfaceInfo.typeVars, 5, `${JSON.stringify(type.interfaceInfo.typeVars.map(tv => tv.object.name))}`);
    const map = new Map();
    type = type.mergeTypeVariablesByName(map);
    assert(map.has('a'));
    assert(map.has('b'));
    const iface = type.interfaceInfo;

    const handleName = iface.handleConnections[0].name as TypeVariable;
    const slotName = iface.slots[0].name as TypeVariable;

    assert.instanceOf(handleName, TypeVariable);
    assert.instanceOf(slotName, TypeVariable);

    assert.strictEqual(handleName.variable, slotName.variable);
    assert.strictEqual(iface.handleConnections[1].type, (iface.handleConnections[2].type as CollectionType<Type>).collectionType);
  });

  it('matches particleSpecs', async () => {
    const manifest = await Manifest.parse(`
        schema Test
        schema NotTest

        particle P
          foo: reads Test

        particle Q
          foo: reads Test
          foo2: reads Test
          foo3: reads Test

        particle R
          foo: writes NotTest
          bar: reads NotTest
          far: writes Test

        particle S
          bar: reads NotTest
          far: writes Test
          foo: writes NotTest
      `);
    const type = new EntityType(manifest.schemas.Test);
    const iface = InterfaceInfo.make('Test', [{name: 'foo', type: TypeVariable.make('a')}, {direction: 'reads', type: TypeVariable.make('b')}, {type}], []);
    assert(!iface.particleMatches(manifest.particles[0]));
    assert(iface.particleMatches(manifest.particles[1]));
    assert(iface.particleMatches(manifest.particles[2]));
    assert(iface.particleMatches(manifest.particles[3]));
  });

  it('matches particleSpecs with slots', async () => {
    const manifest = await Manifest.parse(`
        schema Test

        particle P
          foo: reads Test

        particle Q
          foo: reads Test
          one: consumes Slot

        particle R
          foo: reads Test
          one: consumes Slot
            other: provides? [Slot]

        particle S
          foo: reads Test
          notTest: consumes Slot
            one: provides? Slot
            randomSlot: provides? [Slot]
      `);
    const type = new EntityType(manifest.schemas.Test);
    const iface = InterfaceInfo.make('Test', [
      {direction: 'reads', type}], [
        {name: 'one'},
        {direction: 'provides', isSet: true}]);

    assert(!iface.particleMatches(manifest.particles[0]));
    assert(!iface.particleMatches(manifest.particles[1]));
    assert(iface.particleMatches(manifest.particles[2]));
    assert(iface.particleMatches(manifest.particles[3]));
  });

  it('Cannot ensure resolved an unresolved type variable', () => {
    const iface = InterfaceInfo.make('Test', [{type: TypeVariable.make('a')}], []);
    assert.isFalse(iface.canEnsureResolved());
  });

  it('Can ensure resolved a schema type', () => {
    const type = EntityType.make(['Thing'], {});
    const iface = InterfaceInfo.make('Test', [{type, name: 'foo'}, {type, direction: 'reads'}, {type}], []);
    assert.isTrue(iface.canEnsureResolved());
    assert.isTrue(iface.maybeEnsureResolved());
  });

  it('Maybe ensure resolved does not mutate on failure', () => {
    const constrainedType1 = TypeChecker.processTypeList(
      TypeVariable.make('a'), [{type: EntityType.make(['Thing'], {}), direction: 'reads'}]
    );
    const constrainedType2 = TypeChecker.processTypeList(
      TypeVariable.make('b'), [{type: EntityType.make(['Thing'], {}), direction: 'writes'}]
    );
    const unconstrainedType = TypeVariable.make('c');
    const allTypes = [constrainedType1, constrainedType2, unconstrainedType];

    const allTypesIface = InterfaceInfo.make('Test',
      [{type: constrainedType1}, {type: unconstrainedType}, {type: constrainedType2}], []);
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isFalse(allTypesIface.canEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()));
    assert.isFalse(allTypesIface.maybeEnsureResolved());
    assert.isTrue(allTypes.every(t => !t.isResolved()),
        'Types should not have been modified by a failed maybeEnsureResolved()');

    const constrainedOnlyIface = InterfaceInfo.make('Test',
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
        input: reads [~a]
        output: writes [~a]

      interface HostedInterface
        reads ~a

      particle Multiplexer
        hostedParticle: hosts HostedInterface
        items: reads [~a]

      recipe
        items: use *
        transformed: create *
        Transformer
          input: items
          output: transformed
        Multiplexer
          items: transformed

      schema Burrito
      particle BurritoDisplayer
        burrito: reads Burrito
    `);

    const recipe = manifest.recipes[0];

    recipe.normalize();

    const burritoDisplayer = manifest.findParticleByName('BurritoDisplayer');
    const multiplexer = recipe.particles.find(p => p.name === 'Multiplexer');

    // Initially handle type are unresolvable type variables.
    assert.lengthOf(recipe.handles, 2, `${JSON.stringify(recipe.handles.map(conn => conn.localName))}`);
    for (const handle of recipe.handleConnections) {
      const collectionType = (handle.type as CollectionType<Type>).collectionType;
      const resolved = collectionType.resolvedType();
      assert.isTrue(resolved instanceof TypeVariable);
      assert.isFalse(resolved.canEnsureResolved());
    }

    const hostedParticleType = multiplexer.spec.getConnectionByName('hostedParticle').type as InterfaceType;
    assert.isTrue(!!hostedParticleType.interfaceInfo.restrictType(burritoDisplayer));

    // After restricting the interface, handle types are constrainted to a Burrito.
    assert.lengthOf(recipe.handles, 2);
    for (const handle of recipe.handles) {
      const collectionType = (handle.type as CollectionType<Type>).collectionType;
      const resolved = collectionType.resolvedType();
      assert.isTrue(collectionType instanceof TypeVariable);
      assert.isTrue(resolved.canEnsureResolved());
      const canWriteSuperset = resolved.canWriteSuperset as EntityType;
      assert.isTrue(canWriteSuperset instanceof EntityType);
      assert.deepStrictEqual(canWriteSuperset.entitySchema.names, ['Burrito']);
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
        input: reads Instrument

      particle Upper
        output: writes Gibson

      interface HostedInterface
        reads writes ~a
      particle Host
        hosted: hosts HostedInterface
        item: reads writes ~a

      recipe
        item: create *
        Lower
          input: item
        Upper
          output: item
        Host
          item: item

      particle ThingCandidate
        thingy: reads writes Thing
      particle InstrumentCandidate
        instrument: reads writes Instrument
      particle GuitarCandidate
        guitar: reads writes Guitar
      particle GibsonCandidate
        gibson: reads writes Gibson
      particle LesPaulCandidate
        lp: reads writes LesPaul
    `);

    const recipe = manifest.recipes[0];
    recipe.normalize();

    const hostParticle = recipe.particles.find(p => p.name === 'Host');
    const hostedInterface = (hostParticle.spec.getConnectionByName('hosted').type as InterfaceType).interfaceInfo;

    const check = (name: string) => hostedInterface.particleMatches(manifest.findParticleByName(name));

    // reads writes Thing is not be compatible with in Instrument input
    // reads writes LesPaul is not be compatible with out Gibson output
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
