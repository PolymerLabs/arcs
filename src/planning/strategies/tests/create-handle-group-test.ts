/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../../runtime/manifest.js';
import {HandleConnection} from '../../../runtime/recipe/handle-connection.js';
import {CreateHandleGroup} from '../../strategies/create-handle-group.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

describe('CreateHandleGroup', () => {
  it('connects variables and inline schemas', async () => {
    const manifest = await Manifest.parse(`
      schema Human
        name: Text
      schema Child extends Human
        toy: Text

      particle Bear
        infant: writes ~a with Child
      particle Describe
        thing: reads * {name: Text}
      particle Entertain
        child: reads writes Child
      particle Notify
        something: reads ~a
      particle Employ
        human: reads Human

      recipe
        Bear
        Describe
        Entertain
        Notify
        Employ
    `);

    const result = await StrategyTestHelper.onlyResult(null, CreateHandleGroup, manifest.recipes[0]);
    assert.lengthOf(result.handles, 1);
    assert.strictEqual(result.handles[0].fate, 'create');
    assert.isTrue(result.isResolved());
  });

  it('requires read-write connection between particles', async () => {
    const manifest = await Manifest.parse(`
      schema Human
        name: Text
      schema Child extends Human
        toy: Text

      particle Entertain
        child: reads Child
      particle Employ
        human: reads Human

      recipe
        Entertain
        Employ
    `);

    assert.isEmpty(await StrategyTestHelper.theResults(null, CreateHandleGroup, manifest.recipes[0]));
  });

  it('does not connect a single particle', async () => {
    const manifest = await Manifest.parse(`
      schema Human
        name: Text

      particle Clone
        before: reads Human
        after: writes Human
        researcher: reads writes Human

      recipe
        Clone
    `);

    assert.isEmpty(await StrategyTestHelper.theResults(null, CreateHandleGroup, manifest.recipes[0]));
  });

  it('connects the biggest groups available', async () => {
    // CreateHandleGroup looks for a maximal group of connections. It's not
    // always the right thing to do, but an experimental step for now. This test
    // should be updated if we do something smarter.
    const manifest = await Manifest.parse(`
      particle ReaderA
        a: reads * {a: Text}
      particle ReaderB
        b: reads * {b: Text}
      particle ReaderC
        c: reads * {c: Text}
      particle ReaderD
        d: reads * {d: Text}
      particle ReaderE
        e: reads * {e: Text}

      particle WriterAB
        ab: writes * {a: Text, b: Text}
      particle WriterBCD
        bcd: writes * {b: Text, c: Text, d: Text}
      particle WriterDE
        de: writes * {d: Text, e: Text}

      recipe
        WriterAB
        WriterBCD
        WriterDE
        ReaderA
        ReaderB
        ReaderC
        ReaderD
        ReaderE
    `);

    const result = await StrategyTestHelper.onlyResult(null, CreateHandleGroup, manifest.recipes[0]);

    assert.lengthOf(result.handles, 1);
    const handle = result.handles[0];
    assert.strictEqual(handle.fate, 'create');

    for (const particle of result.particles) {

      if (['ReaderB', 'ReaderC', 'ReaderD', 'WriterBCD'].includes(particle.name)) {
        const connections = Object.values(particle.connections);
        assert.lengthOf(connections, 1);
        const connection = connections[0] as HandleConnection;
          assert.strictEqual(connection.handle, handle);
      } else {
        assert.isEmpty(Object.values(particle.connections));
      }
    }
  });
});
