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
import {PolicyEgressType, PolicyRetentionMedium, PolicyAllowedUsageType} from '../policy.js';
import {assertThrowsAsync} from '../../../testing/test-util.js';
import {mapToDictionary} from '../../util.js';

// TODO(b/157605585): Test what happens with >1 description, egressType,
// allowedRetention, allowedUsage.

const customAnnotation = `
annotation custom
  targets: [Policy, PolicyTarget, PolicyField]
  retention: Source
  doc: 'custom annotation for testing'`;

async function parsePolicy(str: string) {
  const manifest = await Manifest.parse(customAnnotation + str);
  assert.lengthOf(manifest.policies, 1);
  return manifest.policies[0];
}

describe('policy', () => {
  it('can round-trip to string', async () => {
    const manifestString = `${customAnnotation}
@intendedPurpose(description: 'test')
@egressType(type: 'Logging')
@custom
policy MyPolicy {
  @maxAge(age: '2days')
  @allowedRetention(medium: 'Ram', encryption: false)
  @allowedRetention(medium: 'Disk', encryption: true)
  @custom
  from SomeType access {
    @allowedUsage(label: 'raw', usageType: 'join')
    @allowedUsage(label: 'truncated', usageType: 'egress')
    sensitiveField {
      @allowedUsage(label: 'redacted', usageType: '*')
      @custom
      someField,
    }
    @custom
    anotherField,
  }
  config SomeConfig {
    abc: '123'
    def: '456'
  }
}`.trim();
    const manifest = await Manifest.parse(manifestString);
    assert.strictEqual(manifest.toString(), manifestString);
  });

  it('policy annotations work', async () => {
    const policy = await parsePolicy(`
@intendedPurpose('test')
@egressType('Logging')
@custom
policy MyPolicy {}`);
    assert.strictEqual(policy.name, 'MyPolicy');
    assert.strictEqual(policy.description, 'test');
    assert.strictEqual(policy.egressType, PolicyEgressType.Logging);
    assert.lengthOf(policy.annotations, 1);
    assert.strictEqual(policy.annotations[0].name, 'custom');
  });

  it('rejects unknown egress types', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
@egressType('SomethingElse')
policy MyPolicy {}`), 'Expected one of: Logging, FederatedAggregation. Found: SomethingElse.');
  });

  it('policy target annotations work', async () => {
    const policy = await parsePolicy(`
policy MyPolicy {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @custom
  from Abc access {}
}`);
    assert.lengthOf(policy.targets, 1);
    const target = policy.targets[0];
    assert.strictEqual(target.schemaName, 'Abc');
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
    assert.lengthOf(target.annotations, 1);
    assert.strictEqual(target.annotations[0].name, 'custom');
  });

  it('rejects duplicate targets', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Abc access {}
  from Abc access {}
}`), 'A definition for Abc already exists.');
  });

  it('rejects duplicate retentions', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  @allowedRetention(medium: 'Ram', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: true)
  from Abc access {}
}`), '@allowedRetention has already been defined for Ram.');
  });

  it('rejects unknown retention mediums', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  @allowedRetention(medium: 'SomethingElse', encryption: false)
  from Abc access {}
}`), 'Expected one of: Ram, Disk. Found: SomethingElse.');
  });

  it('policy field annotations work', async () => {
    const policy = await parsePolicy(`
policy MyPolicy {
  from Abc access {
    @allowedUsage(label: 'redacted', usageType: 'egress')
    @allowedUsage(label: 'redacted', usageType: 'join')
    @custom
    parent {
      @allowedUsage(label: 'truncated', usageType: 'join')
      @custom
      child1,

      @allowedUsage(label: 'raw', usageType: '*')
      child2,
    }
  }
}`);
    const fields = policy.targets[0].fields;
    assert.lengthOf(fields, 1);

    const parent = fields[0];
    assert.strictEqual(parent.name, 'parent');
    assert.deepStrictEqual(parent.allowedUsages, [
      {
        usage: PolicyAllowedUsageType.Egress,
        label: 'redacted',
      },
      {
        usage: PolicyAllowedUsageType.Join,
        label: 'redacted',
      },
    ]);
    assert.lengthOf(parent.annotations, 1);
    assert.strictEqual(parent.annotations[0].name, 'custom');

    const subfields = parent.subfields;
    assert.lengthOf(subfields, 2);
    const [child1, child2] = subfields;

    assert.strictEqual(child1.name, 'child1');
    assert.deepStrictEqual(child1.allowedUsages, [{
      usage: PolicyAllowedUsageType.Join,
      label: 'truncated',
    }]);
    assert.lengthOf(child1.annotations, 1);
    assert.strictEqual(child1.annotations[0].name, 'custom');

    assert.strictEqual(child2.name, 'child2');
    assert.deepStrictEqual(child2.allowedUsages, [{
      usage: PolicyAllowedUsageType.Any,
      label: 'raw',
    }]);
    assert.lengthOf(child2.annotations, 0);
  });

  it('rejects unknown usage types', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Abc access {
    @allowedUsage(label: 'redacted', usageType: 'SomethingElse')
    field,
  }
}`), 'Unknown usage type: SomethingElse');
  });

  it('rejects duplicate usage types', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Abc access {
    @allowedUsage(label: 'redacted', usageType: 'egress')
    @allowedUsage(label: 'redacted', usageType: 'egress')
    field,
  }
}`), `Usage of label 'redacted' for usage type 'egress' has already been allowed.`);
  });

  it('rejects duplicate fields', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Abc access {
    abc,
    abc,
  }
}`), 'A definition for abc already exists.');
  });

  it('rejects duplicate subfields', async () => {
    await assertThrowsAsync(async () => parsePolicy(`
policy MyPolicy {
  from Abc access {
    parent {
      child,
      child {
        grandchild
      }
    }
  }
}`), 'A definition for child already exists.');
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
}`), 'A definition for Abc already exists.');
  });
});
