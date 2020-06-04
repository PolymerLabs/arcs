/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Policy} from '../../runtime/policy/policy.js';
import {PolicyProto} from '../manifest-proto.js';
import {policyToProtoPayload} from '../policy2proto.js';
import {Manifest} from '../../runtime/manifest.js';
import {assert} from '../../platform/chai-web.js';

const customAnnotation = `
annotation custom
  targets: [Policy, PolicyTarget, PolicyField]
  retention: Source
  doc: 'custom annotation for testing'`;


/** Converts from Policy class to proto payload (JSON), to proto, and back to JSON. */
function toProtoAndBack(policy: Policy) {
  return PolicyProto.fromObject(policyToProtoPayload(policy)).toJSON();
}

async function parsePolicyToProto(str: string) {
  const manifest = await Manifest.parse(customAnnotation + str);
  assert.lengthOf(manifest.policies, 1);
  const policy = manifest.policies[0];
  return toProtoAndBack(policy);
}

describe('policy2proto', () => {
  it('encodes policies', async () => {
    const proto = await parsePolicyToProto(`
@intendedPurpose('test')
@egressType('Logging')
@custom
policy MyPolicy {}
`);
    assert.deepStrictEqual(proto, {
      name: 'MyPolicy',
      description: 'test',
      egressType: 'LOGGING',
      annotations: [{name: 'custom'}],
    });
  });

  it('handles missing annotations', async () => {
    const proto = await parsePolicyToProto(`
policy MyPolicy {}
`);
    assert.deepStrictEqual(proto, {
      name: 'MyPolicy',
    });
  });

  it('encodes policy targets', async () => {
    const proto = await parsePolicyToProto(`
policy MyPolicy {
  @allowedRetention(medium: 'Disk', encryption: true)
  @allowedRetention(medium: 'Ram', encryption: false)
  @custom
  from Abc access {}
}`);

    assert.deepStrictEqual(proto, {
      name: 'MyPolicy',
      targets: [{
        schemaType: 'Abc',
        retentions: [
          {medium: 'DISK', encryptionRequired: true},
          {medium: 'RAM', encryptionRequired: false},
        ],
        annotations: [{name: 'custom'}],
      }],
    });
  });


  it('encodes policy fields', async () => {
    const proto = await parsePolicyToProto(`
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
    assert.deepStrictEqual(proto, {
      name: 'MyPolicy',
      targets: [{
        schemaType: 'Abc',
        fields: [{
          name: 'parent',
          usages: [
            {redactionLabel: 'redacted', usage: 'EGRESS'},
            {redactionLabel: 'redacted', usage: 'JOIN'},
          ],
          subfields: [
            {
              name: 'child1',
              usages: [{redactionLabel: 'truncated', usage: 'JOIN'}],
              annotations: [{name: 'custom'}],
            },
            {
              name: 'child2',
              usages: [{redactionLabel: '', usage: 'ANY'}],
            },
          ],
          annotations: [{name: 'custom'}],
        }],
      }],
    });
  });

  it('encodes policy configs', async () => {
    const proto = await parsePolicyToProto(`
policy MyPolicy {
  config MyConfig {
    abc: '123'
    def: '456'
  }
}`);
    assert.deepStrictEqual(proto, {
      name: 'MyPolicy',
      configs: [{
        name: 'MyConfig',
        metadata: {
          abc: '123',
          def: '456',
        }
      }],
    });
  });
});
