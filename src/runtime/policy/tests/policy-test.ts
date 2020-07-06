/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../../manifest.js';
import {assert} from '../../../platform/chai-web.js';
import {PolicyEgressType, PolicyRetentionMedium, PolicyAllowedUsageType, Policy} from '../policy.js';
import {assertThrowsAsync} from '../../../testing/test-util.js';
import {mapToDictionary} from '../../util.js';
import {TtlUnits, Persistence, Encryption, Capabilities, CapabilityRange, Ttl} from '../../capabilities.js';

const customAnnotation = `
annotation custom
  targets: [Policy, PolicyTarget, PolicyField]
  retention: Source
  doc: 'custom annotation for testing'
`;

const personSchema = `
schema Person
  name: Text
  age: Number
  friends: [&Friend {name: Text, age: Number}]
`;

async function parsePolicy(str: string) {
  const manifest = await Manifest.parse(customAnnotation + personSchema + str);
  assert.lengthOf(manifest.policies, 1);
  return manifest.policies[0];
}

describe('policy', () => {
  it('can round-trip to string', async () => {
    const manifestString = `
${customAnnotation.trim()}
${personSchema.trim()}
@intendedPurpose(description: 'test')
@egressType(type: 'Logging')
@custom
policy MyPolicy {
  @maxAge(age: '2d')
  @allowedRetention(medium: 'Ram', encryption: false)
  @allowedRetention(medium: 'Disk', encryption: true)
  @custom
  from Person access {
    @allowedUsage(label: 'raw', usageType: 'join')
    @allowedUsage(label: 'truncated', usageType: 'egress')
    friends {
      @allowedUsage(label: 'redacted', usageType: '*')
      @custom
      age,
    }
    @custom
    name,
  }
  config SomeConfig {
    abc: '123'
    def: '456'
  }
}`.trim();
    const manifest = await Manifest.parse(manifestString);
    assert.strictEqual(manifest.toString(), manifestString);
  });

  it('rejects duplicate policy names', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {}
policy MyPolicy {}
`), 'A policy named MyPolicy already exists.');
  });

  it('policy annotations work', async () => {
    const policy = await parsePolicy(`
@intendedPurpose('test')
@egressType('Logging')
@custom
policy MyPolicy {}
`);
    assert.strictEqual(policy.name, 'MyPolicy');
    assert.strictEqual(policy.description, 'test');
    assert.strictEqual(policy.egressType, PolicyEgressType.Logging);
    assert.lengthOf(policy.customAnnotations, 1);
    assert.strictEqual(policy.customAnnotations[0].name, 'custom');
  });

  it('handles missing policy annotations', async () => {
    const policy = await parsePolicy(`
policy MyPolicy {}
`);
    assert.isNull(policy.description);
    assert.isNull(policy.egressType);
  });

  it('rejects unknown egress types', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
@egressType('SomethingElse')
policy MyPolicy {}
`), 'Expected one of: Logging, FederatedAggregation. Found: SomethingElse.');
  });

  it('policy target annotations work', async () => {
    const policy = await parsePolicy(`
policy MyPolicy {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('2d')
  @custom
  from Person access {}
}`);
    assert.lengthOf(policy.targets, 1);
    const target = policy.targets[0];
    assert.strictEqual(target.schemaName, 'Person');
    assert.deepStrictEqual(target.retentions, [
      {
        medium: PolicyRetentionMedium.Disk,
        encryptionRequired: true,
      },
      {
        medium: PolicyRetentionMedium.Ram,
        encryptionRequired: false,
      },
    ]);
    assert.strictEqual(target.maxAge.count, 2);
    assert.strictEqual(target.maxAge.units, TtlUnits.Days);
    assert.lengthOf(target.customAnnotations, 1);
    assert.strictEqual(target.customAnnotations[0].name, 'custom');
  });

  it('handles missing target annotations', async () => {
    const policy = await parsePolicy(`
policy MyPolicy {
  from Person access {}
}
`);
    const target = policy.targets[0];
    assert.strictEqual(target.maxAge.millis, 0);
    assert.isEmpty(target.fields);
    assert.isEmpty(target.customAnnotations);
  });

  it('rejects unknown target types', async () => {
    await assertThrowsAsync(async () => await parsePolicy(`
policy MyPolicy {
  from UnknownType access {}
}`), `Unknown type name: UnknownType.`);
  });

  it('rejects duplicate targets', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Person access {}
  from Person access {}
}`), `A definition for 'Person' already exists.`);
  });

  it('rejects duplicate retentions', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: true)
  from Person access {}
}`), '@allowedRetention has already been defined for Ram.');
  });

  it('rejects unknown retention mediums', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  @allowedRetention(medium: 'SomethingElse', encryption: false)
  from Person access {}
}`), 'Expected one of: Ram, Disk. Found: SomethingElse.');
  });

  it('rejects invalid maxAge', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  @maxAge('4x')
  from Person access {}
}`), 'Invalid ttl: 4x');
  });

  it('policy field annotations work', async () => {
    const policy = await parsePolicy(`
policy MyPolicy {
  from Person access {
    @allowedUsage(label: 'redacted', usageType: 'egress')
    @allowedUsage(label: 'redacted', usageType: 'join')
    @custom
    friends {
      @allowedUsage(label: 'truncated', usageType: 'join')
      @custom
      name,

      @allowedUsage(label: 'raw', usageType: '*')
      age,
    }
  }
}`);
    const fields = policy.targets[0].fields;
    assert.lengthOf(fields, 1);

    const friends = fields[0];
    assert.strictEqual(friends.name, 'friends');
    assert.deepStrictEqual(friends.allowedUsages, [
      {
        usage: PolicyAllowedUsageType.Egress,
        label: 'redacted',
      },
      {
        usage: PolicyAllowedUsageType.Join,
        label: 'redacted',
      },
    ]);
    assert.lengthOf(friends.customAnnotations, 1);
    assert.strictEqual(friends.customAnnotations[0].name, 'custom');

    const subfields = friends.subfields;
    assert.lengthOf(subfields, 2);
    const [name, age] = subfields;

    assert.strictEqual(name.name, 'name');
    assert.deepStrictEqual(name.allowedUsages, [{
      usage: PolicyAllowedUsageType.Join,
      label: 'truncated',
    }]);
    assert.lengthOf(name.customAnnotations, 1);
    assert.strictEqual(name.customAnnotations[0].name, 'custom');

    assert.strictEqual(age.name, 'age');
    assert.deepStrictEqual(age.allowedUsages, [{
      usage: PolicyAllowedUsageType.Any,
      label: '',
    }]);
    assert.lengthOf(age.customAnnotations, 0);
  });

  it('rejects unknown fields and subfields', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Person access {
    unknownField,
  }
}`), /Schema 'Person \{.*\}' does not contain field 'unknownField'/);
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Person access {
    friends {
      unknownField,
    }
  }
}`), /Schema 'Friend \{.*\}' does not contain field 'unknownField'/);
  });

  it('rejects unknown usage types', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Person access {
    @allowedUsage(label: 'redacted', usageType: 'SomethingElse')
    age,
  }
}`), 'Expected one of: *, egress, join. Found: SomethingElse.');
  });

  it('rejects duplicate usage types', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Person access {
    @allowedUsage(label: 'redacted', usageType: 'egress')
    @allowedUsage(label: 'redacted', usageType: 'egress')
    age,
  }
}`), `Usage of label 'redacted' for usage type 'egress' has already been allowed.`);
  });

  it('rejects duplicate fields', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Person access {
    abc,
    abc,
  }
}`), `A definition for 'abc' already exists.`);
  });

  it('rejects duplicate subfields', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Person access {
    friends,
    friends {
      name
    }
  }
}`), `A definition for 'friends' already exists.`);
  });

  it('allowed usages defaults to any', async () => {
    const policyStr = `
policy MyPolicy {
  from Person access {
    age,
  }
}`.trim();
    const policy = await parsePolicy(policyStr);
    assert.deepStrictEqual(policy.targets[0].fields[0].allowedUsages, [{
      label: '',
      usage: PolicyAllowedUsageType.Any,
    }]);

    assert.strictEqual(policy.toManifestString(), policyStr);
  });

  it('policy configs work', async () => {
    const policy = await parsePolicy(`
policy MyPolicy {
  config MyConfig {
    abc: '123'
    def: '456'
  }
}`);
    assert.lengthOf(policy.configs, 1);
    const config = policy.configs[0];
    assert.strictEqual(config.name, 'MyConfig');
    assert.deepStrictEqual(mapToDictionary(config.metadata), {
      abc: '123',
      def: '456',
    });
  });

  it('rejects duplicate configs', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  config Abc {}
  config Abc {}
}`), `A definition for 'Abc' already exists.`);
  });

  it('converts to capabilities', async () => {
    const target = (await parsePolicy(`
policy MyPolicy {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('2d')
  @custom
  from Person access {}
}`)).targets[0];
    const capabilities = target.toCapabilities();
    assert.lengthOf(capabilities, 2);
    assert.isTrue(capabilities[0].isEquivalent(Capabilities.create([
      Persistence.onDisk(), new Encryption(true), Ttl.days(2)
    ])));
    assert.isTrue(capabilities[1].isEquivalent(
      Capabilities.create([Persistence.inMemory(), Ttl.days(2)])
    ));
  });
});
