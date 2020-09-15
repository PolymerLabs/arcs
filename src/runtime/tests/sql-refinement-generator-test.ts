/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SQLExtracter} from '../sql-refinement-generator.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {Flags} from '../../runtime/flags.js';

describe('SQLExtracter', () => {
  it('can create queries from refinement expressions involving math expressions', Flags.withFieldRefinementsAllowed(async () => {
      const manifest = await Manifest.parse(`
        particle Foo
          input: reads Something {a: Number [ a > 3 and a != 100 ], b: Number [b > 20 and b < 100] } [a + b/3 > 100]
      `);
      const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
      const query: string = SQLExtracter.fromSchema(schema, 'table');
      assert.strictEqual(query, 'SELECT * FROM table WHERE (300 < (b + (a * 3))) AND ((a > 3) AND (a <> 100)) AND ((b > 20) AND (b < 100));');
  }));
  it('can create queries from refinement expressions involving boolean expressions', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean [ not (a == true) ], b: Boolean [not not b != false] } [a or b]
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table WHERE ((b = 1) OR (a = 1)) AND (NOT (a = 1)) AND (b = 1);');
  }));
  it('can create queries where field refinement is null', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean, b: Boolean} [a and b]
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table WHERE ((b = 1) AND (a = 1));');
  });
  it('can create queries where schema refinement is null', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean [not a], b: Boolean [b]}
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table WHERE (NOT (a = 1)) AND (b = 1);');
  }));
  it('can create queries where there is no refinement', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean, b: Boolean}
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table;');
  });
  describe('can create refinements using built in functions', () => {
    const sqlForFilterWithFunction = async (refinement: string, expected: string, type: string) => {
      const manifest = await Manifest.parse(`
        particle Foo
          input: reads Something {time: ${type}} [${refinement}]
      `);
      const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
      const query = SQLExtracter.fromSchema(schema, 'table');
      assert.strictEqual(query, expected);
    };
    it('can create queries using now()', async () => {
      await sqlForFilterWithFunction(
        'time < now()',
        `SELECT * FROM table WHERE (time < (STRFTIME('%s','now') || SUBSTR(STRFTIME('%f','now'),4)));`,
        'Instant'
      );
      await sqlForFilterWithFunction(
        'time < now()',
        `SELECT * FROM table WHERE (time < (STRFTIME('%s','now') || SUBSTR(STRFTIME('%f','now'),4)));`,
        'Long'
      );
    });
    it('can create queries using creationTime()', async () => {
      await sqlForFilterWithFunction(
        'time < creationTime()',
        `SELECT * FROM table WHERE (time < creation_timestamp);`,
        'Instant'
      );
      await sqlForFilterWithFunction(
        'time < creationTime()',
        `SELECT * FROM table WHERE (time < creation_timestamp);`,
        'Long'
      );
    });
    it('can create queries using expirationTime()', async () => {
      await sqlForFilterWithFunction(
        'time < expirationTime()',
        `SELECT * FROM table WHERE (time < expiration_timestamp);`,
        'Instant'
      );
      await sqlForFilterWithFunction(
        'time < expirationTime()',
        `SELECT * FROM table WHERE (time < expiration_timestamp);`,
        'Long'
      );
    });
  });
});
