/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {KTExtracter} from '../kotlin-refinement-generator.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {Flags} from '../../runtime/flags.js';

describe('KTExtracter', () => {
  it('creates queries from refinement expressions involving math expressions', Flags.withFieldRefinementsAllowed(async () => {
      const manifest = await Manifest.parse(`
        particle Foo
          input: reads Something {a: Number [ a > 3 and a != 100 ], b: Number [b > 20 and b < 100] } [a + b/3 > 100]
      `);
      const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
      const query: string = KTExtracter.fromSchema(schema);
      assert.strictEqual(query,
        `\
val a = data.singletons["a"].toPrimitiveValue(Double::class, 0.0)
val b = data.singletons["b"].toPrimitiveValue(Double::class, 0.0)
((b + (a * 3)) > 300) && ((a > 3) && (!(a == 100))) && ((b > 20) && (b < 100))`);
  }));
  it('creates queries from refinement expressions involving boolean expressions', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean [ not (a == true) ], b: Boolean [not not b != false] } [a or b]
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = KTExtracter.fromSchema(schema);
    //TODO(cypher1): Implement some simple boolean simplifications.
    //This should simplify to, '(!a) && b'
    assert.strictEqual(query, `\
val a = data.singletons["a"].toPrimitiveValue(Boolean::class, false)
val b = data.singletons["b"].toPrimitiveValue(Boolean::class, false)
(b || a) && (!a) && b`);
  }));
  it('creates queries where field refinement is null', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean, b: Boolean} [a and b]
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = KTExtracter.fromSchema(schema);
    assert.strictEqual(query, `\
val a = data.singletons["a"].toPrimitiveValue(Boolean::class, false)
val b = data.singletons["b"].toPrimitiveValue(Boolean::class, false)
(b && a)`);
  });
  it('creates queries where schema refinement is null', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean [not a], b: Boolean [b]}
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = KTExtracter.fromSchema(schema);
    assert.strictEqual(query, `\
val a = data.singletons["a"].toPrimitiveValue(Boolean::class, false)
val b = data.singletons["b"].toPrimitiveValue(Boolean::class, false)
(!a) && b`);
  }));
  it('creates queries where there is no refinement', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean, b: Boolean}
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = KTExtracter.fromSchema(schema);
    assert.strictEqual(query, 'true');
  });
});
