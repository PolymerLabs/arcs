/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {parse} from '../../../gen/runtime/manifest-parser.js';
import {assert} from '../../../platform/chai-web.js';
import {mapToDictionary} from '../../util.js';

const noParamAnnotationRef = {
  kind: 'annotation-ref',
  name: 'noParam',
  params: [],
};

const oneParamAnnotationRef = {
  kind: 'annotation-ref',
  name: 'oneParam',
  params: [{
    kind: 'annotation-simple-param',
    value: 'aaa',
  }],
};

/** Recursively delete all fields with the given name. */
// tslint:disable-next-line: no-any
function deleteFieldRecursively(node: any, field: string) {
  if (node == null || typeof node !== 'object') {
    return;
  }
  if (field in node) {
    delete node[field];
  }
  for (const value of Object.values(node)) {
    deleteFieldRecursively(value, field);
  }
}

function parsePolicy(str: string) {
  const nodes = parse(str);
  assert.lengthOf(nodes, 1, `Expected a single policy, found ${nodes.length}.`);
  const node = nodes[0];
  assert.strictEqual(
    node.kind, 'policy',
    `Expected a single policy node, found node with kind ${node.kind}.`);
  deleteFieldRecursively(node, 'location');
  return node;
}

describe('policy parser', () => {
  it('parses an empty policy', () => {
    const policy = parsePolicy(`policy MyPolicy {}`);
    assert.deepEqual(policy, {
      kind: 'policy',
      name: 'MyPolicy',
      targets: [],
      configs: [],
      annotationRefs: [],
    });
  });

  it('parses a policy with annotations', () => {
    const policy = parsePolicy(`@noParam
@oneParam('aaa')
policy MyPolicy {}`);
    assert.deepStrictEqual(policy.annotationRefs, [
      noParamAnnotationRef,
      oneParamAnnotationRef,
    ]);
  });

  describe('targets', () => {
    it('parses a single empty target', () => {
      const policy = parsePolicy(`policy MyPolicy {
        from Abc access {}
      }`);
      assert.deepStrictEqual(policy.targets, [{
        kind: 'policy-target',
        schemaName: 'Abc',
        fields: [],
        annotationRefs: [],
      }]);
    });

    it('parses multiple targets', () => {
      const policy = parsePolicy(`policy MyPolicy {
        from Abc access {}
        from Xyz access {}
      }`);
      assert.lengthOf(policy.targets, 2);
      assert.deepStrictEqual(policy.targets.map(target => target.schemaName), [
        'Abc',
        'Xyz',
      ]);
    });

    it('parses a target with annotations', () => {
      const policy = parsePolicy(`policy MyPolicy {
        @noParam
        @oneParam('aaa')
        from Abc access {}
      }`);
      assert.deepStrictEqual(policy.targets[0].annotationRefs, [
        noParamAnnotationRef,
        oneParamAnnotationRef,
      ]);
    });

    it('parses a single field', () => {
      const policy = parsePolicy(`policy MyPolicy {
        from Abc access {
          someField,
        }
      }`);
      assert.deepStrictEqual(policy.targets[0].fields, [{
        kind: 'policy-field',
        name: 'someField',
        subfields: [],
        annotationRefs: [],
      }]);
    });

    it('parses a field with annotations', () => {
      const policy = parsePolicy(`policy MyPolicy {
        from Abc access {
          @noParam
          @oneParam('aaa')
          someField
        }
      }`);
      assert.deepStrictEqual(policy.targets[0].fields[0].annotationRefs, [
        noParamAnnotationRef,
        oneParamAnnotationRef,
      ]);
    });

    it('parses multiple fields', () => {
      const policy = parsePolicy(`policy MyPolicy {
        from Abc access {
          someField1,
          someField2,
          someField3
        }
      }`);
      assert.deepStrictEqual(policy.targets[0].fields.map(field => field.name), [
        'someField1',
        'someField2',
        'someField3',
      ]);
    });

    it('parses nested fields', () => {
      const policy = parsePolicy(`policy MyPolicy {
        from Abc access {
          grandParent {
            parent1 {
              child1,
              child2
            },
            parent2 { child3, },
          },
          parent3 { child4, child5 }
          child6
          child7,
        }
      }`);
      deleteFieldRecursively(policy, 'kind');
      deleteFieldRecursively(policy, 'annotationRefs');
      assert.deepStrictEqual(policy.targets[0].fields, [
        {name: 'grandParent', subfields: [
          {name: 'parent1', subfields: [
            {name: 'child1', subfields: []},
            {name: 'child2', subfields: []},
          ]},
          {name: 'parent2', subfields: [
            {name: 'child3', subfields: []},
          ]},
        ]},
        {name: 'parent3', subfields: [
          {name: 'child4', subfields: []},
          {name: 'child5', subfields: []},
        ]},
        {name: 'child6', subfields: []},
        {name: 'child7', subfields: []},
      ]);
    });

    it('parses nested fields with annotations', () => {
      const policy = parsePolicy(`policy MyPolicy {
        from Abc access {
          grandParent {
            @noParam
            parent {
              child1,
              @oneParam('aaa')
              child2
            },
          },
        }
      }`);
      assert.deepStrictEqual(policy.targets[0].fields, [
        {
          name: 'grandParent',
          kind: 'policy-field',
          annotationRefs: [],
          subfields: [
            {
              name: 'parent',
              kind: 'policy-field',
              annotationRefs: [noParamAnnotationRef],
              subfields: [
                {
                  name: 'child1',
                  kind: 'policy-field',
                  annotationRefs: [],
                  subfields: [],
                },
                {
                  name: 'child2',
                  kind: 'policy-field',
                  annotationRefs: [oneParamAnnotationRef],
                  subfields: [],
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('configs', () => {
    it('parses an empty config', () => {
      const policy = parsePolicy(`policy MyPolicy {
          config myConfig {}
        }`);
      const config = policy.configs[0];
      assert.strictEqual(config.name, 'myConfig');
      assert.isEmpty(config.metadata);
    });

    it('parses multiple configs', () => {
      const policy = parsePolicy(`policy MyPolicy {
          config myConfig1 {}
          config myConfig2 {}
          config myConfig3 {}
        }`);
      assert.lengthOf(policy.configs, 3);
      assert.deepStrictEqual(policy.configs.map(config => config.name), [
        'myConfig1',
        'myConfig2',
        'myConfig3',
      ]);
    });

    it('parses a single config value', () => {
      const policy = parsePolicy(`policy MyPolicy {
          config myConfig {abc:'xyz'}
        }`);
      assert.deepStrictEqual(mapToDictionary(policy.configs[0].metadata), {
        abc: 'xyz',
      });
    });

    it('accepts trailing commas', () => {
      const policy = parsePolicy(`policy MyPolicy {
          config myConfig { abc: 'xyz', }
        }`);
      assert.deepStrictEqual(mapToDictionary(policy.configs[0].metadata), {
        abc: 'xyz',
      });
    });

    it('parses multiple config values on the same line', () => {
      const policy = parsePolicy(`policy MyPolicy {
          config myConfig { abc1: 'xyz1', abc2: 'xyz2', abc3: 'xyz3' }
        }`);
      assert.deepStrictEqual(mapToDictionary(policy.configs[0].metadata), {
        abc1: 'xyz1',
        abc2: 'xyz2',
        abc3: 'xyz3',
      });
    });

    it('parses multiple config values on different lines with commas', () => {
      const policy = parsePolicy(`policy MyPolicy {
          config myConfig {
            abc1: 'xyz1',
            abc2: 'xyz2',
            abc3: 'xyz3',
          }
        }`);
      assert.deepStrictEqual(mapToDictionary(policy.configs[0].metadata), {
        abc1: 'xyz1',
        abc2: 'xyz2',
        abc3: 'xyz3',
      });
    });

    it('parses multiple config values on different lines without commas', () => {
      const policy = parsePolicy(`policy MyPolicy {
          config myConfig {
            abc1: 'xyz1'
            abc2: 'xyz2'
            abc3: 'xyz3'
          }
        }`);
      assert.deepStrictEqual(mapToDictionary(policy.configs[0].metadata), {
        abc1: 'xyz1',
        abc2: 'xyz2',
        abc3: 'xyz3',
      });
    });

    it('rejects duplicate keys', () => {
      assert.throws(() => parsePolicy(`policy MyPolicy {
        config myConfig {
          abc: '123'
          abc: '456'
        }
      }`), `Duplicate key in policy config: abc`);
    });
  });
});
