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
import {IngressValidation} from '../ingress-validation.js';
import {Capabilities, Persistence, Encryption, Ttl} from '../../capabilities.js';

const personSchema = `
schema Address
  number: Number
  street: Text
  city: Text
  country: Text
schema Person
  name: Text
  phone: Text
  birthday: Text
  address: &Address
  otherAddresses: [&Address {street, city, country}]
`;

describe('ingress validation', () => {
  it('restricts types according to multiple policies', async () => {
    const [policy0, policy1, policy2] = (await Manifest.parse(`
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
    assert.deepEqual(Object.keys(policy0.targets[0].getRestrictedType().getEntitySchema().fields),
        ['name', 'address']);
    assert.deepEqual(Object.keys(policy1.targets[0].getRestrictedType().getEntitySchema().fields),
        ['address', 'otherAddresses']);
    assert.deepEqual(Object.keys(policy2.targets[0].getRestrictedType().getEntitySchema().fields),
        ['name', 'otherAddresses']);

    const restrictedType = new IngressValidation([policy0, policy1, policy2]).getRestrictedType('Person');
    const restrictedSchema = restrictedType.getEntitySchema();
    assert.equal(restrictedSchema.name, 'Person');
    assert.deepEqual(Object.keys(restrictedSchema.fields), ['name', 'address', 'otherAddresses']);
    assert.deepEqual(Object.keys(restrictedSchema.fields['address'].schema.model.entitySchema.fields),
        ['number', 'street', 'city']);
    assert.deepEqual(Object.keys(restrictedSchema.fields['otherAddresses'].schema.schema.model.entitySchema.fields),
        ['city', 'country']);
  });

  it('constructs', async () => {
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
    assert.deepEqual(ingressValidation0.getCapabilities(['Person', 'name']), policy0Capabilities);
    assert.isUndefined(ingressValidation0.getCapabilities(['Person', 'phone']));
    assert.isUndefined(ingressValidation0.getCapabilities(['Person', 'noSuchProperty']));
    assert.deepEqual(ingressValidation0.getCapabilities(['Person', 'birthday']), policy0Capabilities);
    assert.isUndefined(ingressValidation0.getCapabilities(['Person', 'address', 'street']));
    assert.deepEqual(ingressValidation0.getCapabilities(['Person', 'address', 'city']), policy0Capabilities);
    assert.deepEqual(ingressValidation0.getCapabilities(['Person', 'address', 'country']), policy0Capabilities);

    // Verify PolicyOne ingress capabilities
    const ingressValidation1 = new IngressValidation([policy1]);
    const policy1Capabilities = [expectedDiskNonEnc10DaysCapabilities];
    assert.deepEqual(ingressValidation1.getCapabilities(['Person', 'name']), policy1Capabilities);
    assert.isUndefined(ingressValidation1.getCapabilities(['Person', 'phone']));
    assert.isUndefined(ingressValidation1.getCapabilities(['Person', 'birthday']));
    assert.isUndefined(ingressValidation1.getCapabilities(['Person', 'address', 'street']));
    assert.isUndefined(ingressValidation1.getCapabilities(['Person', 'address', 'city']));
    assert.deepEqual(ingressValidation1.getCapabilities(['Person', 'address', 'country']), policy1Capabilities);

    // Verify PolicyTwo ingress capabilities
    const ingressValidation2 = new IngressValidation([policy2]);
    assert.isUndefined(ingressValidation2.getCapabilities(['Person', 'name']));
    assert.isUndefined(ingressValidation2.getCapabilities(['Person', 'phone']));
    assert.isUndefined(ingressValidation2.getCapabilities(['Person', 'birthday']));
    assert.isUndefined(ingressValidation2.getCapabilities(['Person', 'address', 'street']));
    assert.isUndefined(ingressValidation2.getCapabilities(['Person', 'address', 'city']));
    assert.isUndefined(ingressValidation2.getCapabilities(['Person', 'address', 'country']));

    // Verify combination of PolicyZero and PolicyOne ingress capabilities
    const ingressValidation0And1 = new IngressValidation([policy0, policy1]);
    assert.deepEqual(ingressValidation0And1.getCapabilities(['Person', 'name']),
        [...policy0Capabilities, ...policy1Capabilities]);
    assert.isUndefined(ingressValidation0And1.getCapabilities(['Person', 'phone']));
    assert.isUndefined(ingressValidation0And1.getCapabilities(['Person', 'noSuchProperty']));
    assert.deepEqual(ingressValidation0And1.getCapabilities(['Person', 'birthday']), policy0Capabilities);
    assert.isUndefined(ingressValidation0And1.getCapabilities(['Person', 'address', 'street']));
    assert.deepEqual(ingressValidation0And1.getCapabilities(['Person', 'address', 'city']), policy0Capabilities);
    assert.deepEqual(ingressValidation0And1.getCapabilities(['Person', 'address', 'country']),
        [...policy0Capabilities, ...policy1Capabilities]);

    // Verify combination of PolicyZero and PolicyTwo ingress capabilities
    const ingressValidation0And2 = new IngressValidation([policy0, policy2]);
    assert.deepEqual(ingressValidation0And2.getCapabilities(['Person', 'name']), policy0Capabilities);
    assert.isUndefined(ingressValidation0And2.getCapabilities(['Person', 'phone']));
    assert.isUndefined(ingressValidation0And2.getCapabilities(['Person', 'noSuchProperty']));
    assert.deepEqual(ingressValidation0And2.getCapabilities(['Person', 'birthday']), policy0Capabilities);
    assert.isUndefined(ingressValidation0And2.getCapabilities(['Person', 'address', 'street']));
    assert.deepEqual(ingressValidation0And2.getCapabilities(['Person', 'address', 'city']), policy0Capabilities);
    assert.deepEqual(ingressValidation0And2.getCapabilities(['Person', 'address', 'country']), policy0Capabilities);
  });
});
