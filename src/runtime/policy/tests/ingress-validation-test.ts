/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../manifest.js';
import {IngressValidation, IngressValidationResult} from '../ingress-validation.js';
import {Capabilities, Persistence, Encryption, Ttl} from '../../capabilities.js';

const personSchema = `
schema Address
  number: Number
  street: Text
  city: Text
  country: Text
schema Person
  name: Text
  age: Number
  phone: Text
  birthday: Text
  address: &Address
  otherAddresses: [&Address {street, city, country}]
`;

describe('ingress validation', () => {
  it('restricts type according to a policy', async () => {
    const ingressValidation = new IngressValidation((await Manifest.parse(`
${personSchema}
policy MyPolicy {
  from Person access {
    name,
    address {
      number
      street,
      city
    },
    otherAddresses {city, country}
  }
}
    `)).policies);
    const schema = ingressValidation.getRestrictedType('Person').getEntitySchema();
    assert.equal(schema.name, 'Person');
    assert.deepEqual(Object.keys(schema.fields), ['name', 'address', 'otherAddresses']);
    assert.deepEqual(Object.keys(schema.fields['address'].schema.model.entitySchema.fields),
        ['number', 'street', 'city']);
    assert.deepEqual(Object.keys(schema.fields['otherAddresses'].schema.schema.model.entitySchema.fields),
        ['city', 'country']);
  });

  it('restricts types according to multiple policies', async () => {
    const policies = (await Manifest.parse(`
${personSchema}
policy PolicyOne {
  from Person access {
    name,
    address {number, street}
  }
}
policy PolicyTwo {
  from Person access {
    address {street, city},
    otherAddresses {city}
  }
}
policy PolicyThree {
  from Person access { name, otherAddresses {country} }
}
    `)).policies;
    const [ingressValidation0, ingressValidation1, ingressValidation2] =
        policies.map(policy => new IngressValidation([policy]));
    assert.deepEqual(Object.keys(ingressValidation0.getRestrictedType('Person').getEntitySchema().fields),
        ['name', 'address']);
    assert.deepEqual(Object.keys(ingressValidation1.getRestrictedType('Person').getEntitySchema().fields),
        ['address', 'otherAddresses']);
    assert.deepEqual(Object.keys(ingressValidation2.getRestrictedType('Person').getEntitySchema().fields),
        ['name', 'otherAddresses']);

    const restrictedType = new IngressValidation(policies).getRestrictedType('Person');
    const restrictedSchema = restrictedType.getEntitySchema();
    assert.equal(restrictedSchema.name, 'Person');
    assert.deepEqual(Object.keys(restrictedSchema.fields), ['name', 'address', 'otherAddresses']);
    assert.deepEqual(Object.keys(restrictedSchema.fields['address'].schema.model.entitySchema.fields),
        ['number', 'street', 'city']);
    assert.deepEqual(Object.keys(restrictedSchema.fields['otherAddresses'].schema.schema.model.entitySchema.fields),
        ['city', 'country']);
  });

  it('fails validating handle with no policy target', async () => {
    const assertFailsWithNoPolicy = async (recipeHandleStr) => {
      const ingressValidation = new IngressValidation((await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Disk', encryption: true)
  @maxAge('2d')
  from Person access {}
}
    `)).policies);
    const recipe = (await Manifest.parse(`
particle P1
  ${recipeHandleStr}
recipe
  fooHandle: create 'my-id' @persistent @ttl('2d')
  P1
    foo: fooHandle
      `)).recipes[0];
      assert.isTrue(recipe.normalize() && recipe.isResolved());
      const result = ingressValidation.validateIngressCapabilities(recipe);
      assert.isFalse(result.success);
      assert.isTrue(result.toString().includes(
          `Handle 'my-id' has no matching target type Foo {value: Text} in policies`),
          `Unexpected error: ${result.toString()}`);
    };
    await assertFailsWithNoPolicy(`foo: reads writes Foo {value: Text}`);
    await assertFailsWithNoPolicy(`foo: writes Foo {value: Text}`);
  });

  const manifestString = (annotations = '') => {
    return `
${personSchema}
particle P1
  person: reads writes Person {name, age}
recipe
  personHandle: create ${annotations}
  P1
    person: personHandle
    `;
  };
  const assertHandleIngressNotAllowed = async (manifestString, policy, expectedError) => {
    const recipe = (await Manifest.parse(manifestString)).recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    const result = new IngressValidation([policy]).validateIngressCapabilities(recipe);
    assert.isFalse(result.success);
    assert.isTrue(result.toString().includes(expectedError),
        `Expected ${result.toString()} to include ${expectedError}`);
  };
  const assertHandleIngressAllowed = async (manifestString, policy) => {
    const recipe = (await Manifest.parse(manifestString)).recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    const options = {errors: new Map()};
    const result = new IngressValidation([policy]).validateIngressCapabilities(recipe);
    assert.isTrue(result.success, `Validation failed with: ${result.toString()}`);
  };

  it('fails validates missing handle capability persistence', async () => {
    const policy = (await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('2d')
  from Person access { name, age }
}
    `)).policies[0];
    await assertHandleIngressNotAllowed(manifestString(), policy, `'inMemory' is not compatible for ingress with 'unspecified'`);
  });

  it('fails validates missing handle capability ttls', async () => {
    const policy = (await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('2d')
  from Person access { name, age }
}
    `)).policies[0];
    await assertHandleIngressNotAllowed(manifestString(`@inMemory`), policy, `'2d' is not compatible for ingress with 'unspecified'`);
  });

  it('fails validating missing handle capability encryption', async () => {
    const policy = (await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: true)
  @maxAge('2d')
  from Person access { name, age }
}
    `)).policies[0];
    await assertHandleIngressNotAllowed(manifestString(`@inMemory @ttl('48h')`), policy, `'encrypted' is not compatible for ingress with 'unspecified'`);
  });

  it('successfully validates default persistence', async () => {
    const policy = (await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('2d')
  from Person access { name, age }
}
    `)).policies[0];
    await assertHandleIngressAllowed(manifestString(`@inMemory @ttl('48h')`), policy);
  });

  it('successfully validates default encryption', async () => {
    const policy = (await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Disk', encryption: false)
  @maxAge('2d')
  from Person access { name, age }
}
    `)).policies[0];
    await assertHandleIngressAllowed(manifestString(`@persistent @ttl('10h')`), policy);
  });

  it('fails validating non restrictive enough handle capabilities', async () => {
    const policy = (await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: true)
  @maxAge('2d')
  from Person access { name, age }
}
    `)).policies[0];
    await assertHandleIngressNotAllowed(
        manifestString(`@persistent @encrypted @ttl('1d')`), policy, `'inMemory' is not compatible for ingress with 'onDisk'`);
    await assertHandleIngressNotAllowed(
        manifestString(`@tiedToArc @ttl('1d')`), policy, `'encrypted' is not compatible for ingress with 'unspecified'`);
    await assertHandleIngressNotAllowed(
        manifestString(`@tiedToArc @encrypted @ttl('10d')`), policy, `'2d' is not compatible for ingress with '10d'`);
  });

  it('validates handle capabilities', async () => {
    const policy = (await Manifest.parse(`
${personSchema}
policy MyPolicy {
  @allowedRetention(medium: 'Disk', encryption: true)
  @maxAge('2d')
  from Person access { name, age }
}
    `)).policies[0];
    const recipe = (await Manifest.parse(
        manifestString(`@persistent @encrypted @ttl('1d')`))).recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    assert.isTrue(new IngressValidation([policy]).validateIngressCapabilities(recipe).success);
  });

  it('verifies policies ingress capabilities', async () => {
    const [policy0, policy1, policy2] = (await Manifest.parse(`
${personSchema}
policy PolicyZero {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('2d')
  from Person access { name, birthday, address {city, country} }
}
policy PolicyOne {
  @allowedRetention(medium: 'Disk', encryption: false)
  @maxAge('10d')
  from Person access { name, address { country } }
}
schema Foo
  bar: Text
policy PolicyTwo {
  from Foo access {}
}
    `)).policies;
    const expectedDiskEnc2DaysCapabilities = Capabilities.create([
        Persistence.onDisk(), new Encryption(true), Ttl.days(2)]);
    const expectedRamNonEnc2DaysCapabilities = Capabilities.create([
        Persistence.inMemory(), new Encryption(false), Ttl.days(2)]);
    const expectedDiskNonEnc10DaysCapabilities = Capabilities.create([
        Persistence.onDisk(), new Encryption(false), Ttl.days(10)]);
    const policy0Capabilities =
        [expectedDiskEnc2DaysCapabilities, expectedRamNonEnc2DaysCapabilities];
    // Verify PolicyZero ingress capabilities
    const ingressValidation0 = new IngressValidation([policy0]);
    assert.deepEqual(ingressValidation0.getFieldCapabilities('Person.name'), policy0Capabilities);
    assert.isUndefined(ingressValidation0.getFieldCapabilities('Person.phone'));
    assert.isUndefined(ingressValidation0.getFieldCapabilities('Person.noSuchProperty'));
    assert.deepEqual(ingressValidation0.getFieldCapabilities('Person.birthday'), policy0Capabilities);
    assert.isUndefined(ingressValidation0.getFieldCapabilities('Person.address.street'));
    assert.deepEqual(ingressValidation0.getFieldCapabilities('Person.address.city'), policy0Capabilities);
    assert.deepEqual(ingressValidation0.getFieldCapabilities('Person.address.country'), policy0Capabilities);

    // Verify PolicyOne ingress capabilities
    const ingressValidation1 = new IngressValidation([policy1]);
    const policy1Capabilities = [expectedDiskNonEnc10DaysCapabilities];
    assert.deepEqual(ingressValidation1.getFieldCapabilities('Person.name'), policy1Capabilities);
    assert.isUndefined(ingressValidation1.getFieldCapabilities('Person.phone'));
    assert.isUndefined(ingressValidation1.getFieldCapabilities('Person.birthday'));
    assert.isUndefined(ingressValidation1.getFieldCapabilities('Person.address.street'));
    assert.isUndefined(ingressValidation1.getFieldCapabilities('Person.address.city'));
    assert.deepEqual(ingressValidation1.getFieldCapabilities('Person.address.country'), policy1Capabilities);

    // Verify PolicyTwo ingress capabilities
    const ingressValidation2 = new IngressValidation([policy2]);
    assert.isUndefined(ingressValidation2.getFieldCapabilities('Person.name'));
    assert.isUndefined(ingressValidation2.getFieldCapabilities('Person.phone'));
    assert.isUndefined(ingressValidation2.getFieldCapabilities('Person.birthday'));
    assert.isUndefined(ingressValidation2.getFieldCapabilities('Person.address.street'));
    assert.isUndefined(ingressValidation2.getFieldCapabilities('Person.address.city'));
    assert.isUndefined(ingressValidation2.getFieldCapabilities('Person.address.country'));

    // Verify combination of PolicyZero and PolicyOne ingress capabilities
    const ingressValidation0And1 = new IngressValidation([policy0, policy1]);
    assert.deepEqual(ingressValidation0And1.getFieldCapabilities('Person.name'),
        [...policy0Capabilities, ...policy1Capabilities]);
    assert.isUndefined(ingressValidation0And1.getFieldCapabilities('Person.phone'));
    assert.isUndefined(ingressValidation0And1.getFieldCapabilities('Person.noSuchProperty'));
    assert.deepEqual(ingressValidation0And1.getFieldCapabilities('Person.birthday'), policy0Capabilities);
    assert.isUndefined(ingressValidation0And1.getFieldCapabilities('Person.address.street'));
    assert.deepEqual(ingressValidation0And1.getFieldCapabilities('Person.address.city'), policy0Capabilities);
    assert.deepEqual(ingressValidation0And1.getFieldCapabilities('Person.address.country'),
        [...policy0Capabilities, ...policy1Capabilities]);

    // Verify combination of PolicyZero and PolicyTwo ingress capabilities
    const ingressValidation0And2 = new IngressValidation([policy0, policy2]);
    assert.deepEqual(ingressValidation0And2.getFieldCapabilities('Person.name'), policy0Capabilities);
    assert.isUndefined(ingressValidation0And2.getFieldCapabilities('Person.phone'));
    assert.isUndefined(ingressValidation0And2.getFieldCapabilities('Person.noSuchProperty'));
    assert.deepEqual(ingressValidation0And2.getFieldCapabilities('Person.birthday'), policy0Capabilities);
    assert.isUndefined(ingressValidation0And2.getFieldCapabilities('Person.address.street'));
    assert.deepEqual(ingressValidation0And2.getFieldCapabilities('Person.address.city'), policy0Capabilities);
    assert.deepEqual(ingressValidation0And2.getFieldCapabilities('Person.address.country'), policy0Capabilities);
  });

  const parseAndResolveRecipe = async (inlineSchema: string, annotations: string = '') => {
    const recipe = (await Manifest.parse(`
${personSchema}
particle WritePerson
  person: writes Person {${inlineSchema}}
recipe
  person: create ${annotations}
  WritePerson
    person: person
      `)).recipes[0];
      assert.isTrue(recipe.normalize());
      assert.isTrue(recipe.isResolved());
      return recipe;
  };

  it('validates skipped fields in restricted type', async () => {
    const ingressValidation = new IngressValidation((await Manifest.parse(`
${personSchema}
  friends: [&Friend {name: Text, hobby: &Hobby {name: Text, description: Text}}]
policy Policy0 {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('10d')
  from Person access { name, birthday, address {city}, friends { hobby {name} } }
}
    `)).policies);
    const schema = [
        'name: Text',
        'address: &Address {city: Text, country: Text}',
        'phone: Text',
        'friends: [&Friend {name: Text, email: Text, hobby: &Hobby {name: Text, description: Text}}]',
        'favoriteFoods: [&Food {name: Text, recipe: Text}]'
    ].join(', ');
    const recipe = await parseAndResolveRecipe(schema);
    assert.isTrue(recipe.handles[0].type.maybeEnsureResolved());
    const skippedFields = [];
    assert.equal(ingressValidation.restrictType(recipe.handles[0].type.resolvedType(), skippedFields).toString(),
        `Person {name: Text, address: &Address {city: Text}, friends: [&Friend {hobby: &Hobby {name: Text}}]}`);
    assert.deepEqual(skippedFields, [
        'address.country',
        'phone',
        'friends.name',
        'friends.email',
        'friends.hobby.description',
        'favoriteFoods'
    ]);
  });

  it('validates recipe handle capabilities', async () => {
    const ingressValidation = new IngressValidation((await Manifest.parse(`
${personSchema}
policy Policy0 {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('10d')
  from Person access { name, birthday, address {city} }
}
    `)).policies);
    // Validation for recipe that writes only Person's name.
    const schema = `name: Text`;
    const recipe = await parseAndResolveRecipe(schema);
    assert.isTrue(recipe.handles[0].type.maybeEnsureResolved());
    assert.equal(ingressValidation.restrictType(recipe.handles[0].type.resolvedType()).toString(),
        `Person {name: Text}`);
    assert.isFalse(ingressValidation.validateIngressCapabilities(recipe).success);
    assert.isFalse(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(schema, `@persistent`)).success);
    assert.isFalse(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(schema, `@persistent @ttl('10days')`)).success);
    assert.isFalse(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(schema, `@persistent @encrypted @ttl('100days')`)).success);
    assert.isTrue(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(schema, `@persistent @encrypted @ttl('10days')`)).success);
    assert.isTrue(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(schema, `@inMemory @ttl('10days')`)).success);
  });

  it('validate recipe handle capabilities with multiple policies', async () => {
    const ingressValidation = new IngressValidation((await Manifest.parse(`
${personSchema}
policy Policy0 {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('10d')
  from Person access { name, birthday, address {city} }
}

policy Policy1 {
    @allowedRetention(medium: 'Ram', encryption: false)
    @maxAge('2d')
    from Person access {
      address {country}
      otherAddresses {country}
    }
}
    `)).policies);
    // Validation for recipe with inline schema handle.
    const inlineSchema = `
name: Text,
phone,
address: &Address {street: Text, city},
otherAddresses: [&Address {city: Text, country}],
anotherField: Text    
    `;
    // Verify handle's restricted type.
    const recipe = await parseAndResolveRecipe(inlineSchema);
    const handle = recipe.handles[0];
    assert.isTrue(handle.type.maybeEnsureResolved());
    assert.equal(ingressValidation.restrictType(handle.type.resolvedType()).toString(),
        `Person {name: Text, address: &Address {city: Text}, otherAddresses: [&Address {country: Text}]}`);

    // Verify ingress capabilities validation.
    assert.isFalse(ingressValidation.validateIngressCapabilities(recipe).success);
    assert.isFalse(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(inlineSchema, `@persistent @ttl('1days')`)).success);
    assert.isFalse(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(inlineSchema, `@persistent @encrypted @ttl('1days')`)).success);
    assert.isFalse(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(inlineSchema, `@inMemory @ttl('10days')`)).success);
    assert.isTrue(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(inlineSchema, `@inMemory @ttl('2days')`)).success);
    assert.isTrue(ingressValidation.validateIngressCapabilities(
        await parseAndResolveRecipe(inlineSchema, `@inMemory @encrypted @ttl('2hours')`)).success);
  });
  // Validate ingress capabilities for derived data
  // WriteFoo --> (Foo) --> ReadFooWriteBar --> (Bar)
  const particleSpecs = `
particle ReadFooWriteBar
  foo: reads Foo {f1: Text}
  bar: reads writes Bar {br1: Text}
particle WriteFoo
  foo: writes Foo {f1: Text, f2: Text}
  `;
  const recipeStr = (opts: {fooCapabilities: string, barCapabilities: string} = {fooCapabilities: '', barCapabilities: ''}) =>
  `
recipe Bar
  fooHandle: create 'foo' ${opts.fooCapabilities}
  barHandle: create 'bar' ${opts.barCapabilities}
  ReadFooWriteBar
    foo: fooHandle
    bar: barHandle
  WriteFoo
    foo: fooHandle
  `;

  it('fails validating derived data with no policy for source', async () => {
    const ingressValidation = new IngressValidation([]);
    const recipe = (await Manifest.parse(`
${particleSpecs}
${recipeStr()}
    `)).recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    const result = ingressValidation.validateIngressCapabilities(recipe);
    assert.isFalse(result.success);
    assert.isTrue(result.toString().includes(
        `Handle 'foo' has no matching target type Foo {f1: Text} in policies, and contributing Particle WriteFoo has no inputs`),
        `Unexpected error: ${result.toString()}`);
  });
  const fooIngressPolicy = () => {
    return `
schema Foo
  f1: Text
  f2: Text
schema Bar
  br1: Text
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('3h')
  from Foo access { f1 }
}`;
  };

  it('fails validating derived data with non restrictive capabilities for source', async () => {
    const ingressValidation = new IngressValidation((await Manifest.parse(fooIngressPolicy())).policies);
    const recipe = (await Manifest.parse(`
${particleSpecs}
${recipeStr({fooCapabilities: `@persistent @ttl('2d')`, barCapabilities: `@persistent @ttl('1d')`})}
    `)).recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    const result = ingressValidation.validateIngressCapabilities(recipe);
    assert.isFalse(result.success);
    assert.isTrue(result.toString().includes(`Failed validating ingress for field 'Foo.f1' of Handle 'bar'`)
        && result.toString().includes(`'inMemory' is not compatible for ingress with 'onDisk'`),
        `Unexpected error: ${result.toString()}`);
  });

  it('successfully validates derived data', async () => {
    const ingressValidation = new IngressValidation((await Manifest.parse(fooIngressPolicy())).policies);
    const recipe = (await Manifest.parse(`
${particleSpecs}
${recipeStr({fooCapabilities: `@inMemory @ttl('2h')`, barCapabilities: `@inMemory @ttl('3h')`})}
    `)).recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    assert.isTrue(ingressValidation.validateIngressCapabilities(recipe).success);
  });

  it('successfully validates derived data and reads-writes fate', async () => {
    // Verifies `reads writes` fate isn't considered a cycle
    const ingressValidation = new IngressValidation((await Manifest.parse(fooIngressPolicy())).policies);
    const particleSpecsWithUpdatedFate = particleSpecs.replace('foo: writes Foo', 'foo: reads writes Foo');
    assert.notEqual(particleSpecsWithUpdatedFate, particleSpecs);
    const recipe = (await Manifest.parse(`
${particleSpecsWithUpdatedFate}
${recipeStr({fooCapabilities: `@inMemory @ttl('2h')`, barCapabilities: `@inMemory @ttl('3h')`})}
    `)).recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    assert.isTrue(ingressValidation.validateIngressCapabilities(recipe).success);
  });

  it('fails gracefully when recipe has cycles', async () => {
    const ingressValidation = new IngressValidation((await Manifest.parse(fooIngressPolicy())).policies);
    const recipe = (await Manifest.parse(`
${particleSpecs}
  bar: reads Bar {br1: Text}
${recipeStr({fooCapabilities: `@inMemory @ttl('2h')`, barCapabilities: `@inMemory @ttl('3h')`})}
    bar: barHandle
    `)).recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    assert.isTrue(ingressValidation.validateIngressCapabilities(recipe).success);
  });

  // WriteFoo --> (Foo) --> ReadFooWriteBar --> (Bar) --> ReadBarWriteBaz -> (Baz)
  it('validates multi level derived data', async () => {
    const validateBaz = async (bazCapabilities: string) =>  {
      const ingressValidation = new IngressValidation((await Manifest.parse(fooIngressPolicy())).policies);
      const recipe = (await Manifest.parse(`
${particleSpecs}
particle ReadBarWriteBaz
  bar: reads Bar {br1: Text}
  baz: writes Baz {bz1: Text}
${recipeStr({fooCapabilities: `@inMemory @ttl('2h')`, barCapabilities: `@inMemory @ttl('3h')`})}
  bazHandle: create 'baz' ${bazCapabilities}
  ReadBarWriteBaz
    bar: barHandle
    baz: bazHandle
      `)).recipes[0];
      assert.isTrue(recipe.normalize() && recipe.isResolved());
      return ingressValidation.validateIngressCapabilities(recipe);
    };
    const resultFail = await validateBaz(`@inMemory @ttl('2 days')`);
    assert.isFalse(resultFail.success);
    assert.isTrue(resultFail.toString().includes(`'3h' is not compatible for ingress with '2d'`),
        `Unexpected error: ${resultFail.toString}`);
    const resultSuccess = await validateBaz(`@inMemory @ttl('2 hours')`);
    assert.isTrue(resultSuccess.success, resultSuccess.toString());
  });

  // Validate ingress capabilities for derived data
  // WriteFoo --> (Foo) -->
  //                            ReadFooWriteBar --> (Bar)
  // WriteFooA --> (FooA) -->
  it('successfully validates data derived from multiple sources', async () => {
    const manifestStr = `
particle ReadFoosWriteBar
  foo: reads Foo {f1: Text}
  fooA: reads FooA {fa1: Text, fa2: Text}
  bar: writes Bar {br1: Text}
particle WriteFoo
  foo: writes Foo {f1: Text, f2: Text}
particle WriteFooA
  fooA: writes FooA {fa1: Text, fa2: Text}
recipe Bar
  fooHandle: create 'foo' @persistent @ttl('2d')
  fooAHandle: create 'fooA' @inMemory @ttl('10m')
  barHandle: create 'bar' @inMemory @ttl('10m')
  ReadFoosWriteBar
    foo: fooHandle
    fooA: fooAHandle
    bar: barHandle
  WriteFoo
    foo: fooHandle
  WriteFooA
    fooA: fooAHandle
    `;
    const recipe = (await Manifest.parse(manifestStr)).recipes[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    const verifyFails = async (policiesStr: string, expectedError: string = '') => {
      const result = new IngressValidation((await Manifest.parse(policiesStr)).policies).validateIngressCapabilities(recipe);
      assert.isFalse(result.success, `Policies ${policiesStr} were expected to fail.`);
      if (expectedError) {
        assert.isTrue(result.toString().includes(expectedError), `Unexpected error: ${result.toString()}`);
      }
    };
    await verifyFails(``);
    const schemaStr = `
schema Foo
  f1: Text
  f2: Text
schema FooA
  fa1: Text
  fa2: Text
    `;
    const fooPolicy = (type: string, fields: string[], medium: string, maxAge: string) => `
policy Policy_${type}${fields.join('')}${medium}${maxAge} {
  @allowedRetention(medium: '${medium}', encryption: false)
  @maxAge('${maxAge}')
  from ${type} access { ${fields.join(', ')} }
}
    `;
    await verifyFails(`
        ${schemaStr}
        ${fooPolicy('Foo', ['f1'], 'Disk', '2d')}`);

    await verifyFails(`
        ${schemaStr}
        ${fooPolicy('Foo', ['f1'], 'Disk', '2d')}
        ${fooPolicy('FooA', ['fa1'], 'Ram', '1h')}
        ${fooPolicy('FooA', ['fa2'], 'Ram', '5m')}`);

    await verifyFails(`
        ${schemaStr}
        ${fooPolicy('Foo', ['f1'], 'Disk', '2d')}
        ${fooPolicy('FooA', ['fa1'], 'Ram', '1h')}
        ${fooPolicy('FooA', ['fa2'], 'Ram', '5m')}
        ${fooPolicy('FooA', ['fa1', 'fa2'], 'Disk', '5h')}
    `);

    assert.isTrue(new IngressValidation((await Manifest.parse(`
        ${schemaStr}
        ${fooPolicy('Foo', ['f1'], 'Disk', '2d')}
        ${fooPolicy('Foo', ['f1'], 'Ram', '2d')}
        ${fooPolicy('FooA', ['fa1'], 'Ram', '1h')}
        ${fooPolicy('FooA', ['fa2'], 'Ram', '5m')}
        ${fooPolicy('FooA', ['fa1', 'fa2'], 'Ram', '5h')}
    `)).policies).validateIngressCapabilities(recipe).success);
  });
});
