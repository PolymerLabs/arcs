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

import {StrategyTestHelper} from './strategy-test-helper.js';

describe('CreateHandleGroup', () => {
  it('connects variables and inline schemas', async () => {
    const manifest = await Manifest.parse(`
      schema Human
        Text name
      schema Child extends Human
        Object toy

      particle Bear
        out ~a with Child infant
      particle Describe
        in * {Text name} thing
      particle Entertain
        inout Child child
      particle Notify
        in ~a something
      particle Employ
        in Human human

      recipe
        Bear
        Describe
        Entertain
        Notify
        Employ
    `);

    const result = await StrategyTestHelper.onlyResult(null, CreateHandleGroup, manifest.recipes[0]);
    assert.lengthOf(result.handles, 1);
    assert.equal(result.handles[0].fate, 'create');
    assert.isTrue(result.isResolved());
  });

  it('requires read-write connection between particles', async () => {
    const manifest = await Manifest.parse(`
      schema Human
        Text name
      schema Child extends Human
        Object toy

      particle Entertain
        in Child child
      particle Employ
        in Human human

      recipe
        Entertain
        Employ
    `);

    assert.isEmpty(await StrategyTestHelper.theResults(null, CreateHandleGroup, manifest.recipes[0]));
  });

  it('does not connect a single particle', async () => {
    const manifest = await Manifest.parse(`
      schema Human
        Text name

      particle Clone
        in Human before
        out Human after
        inout Human researcher

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
        in * {Text a} a
      particle ReaderB
        in * {Text b} b
      particle ReaderC
        in * {Text c} c
      particle ReaderD
        in * {Text d} d
      particle ReaderE
        in * {Text e} e

      particle WriterAB
        out * {Text a, Text b} ab
      particle WriterBCD
        out * {Text b, Text c, Text d} bcd
      particle WriterDE
        out * {Text d, Text e} de

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
    assert.equal(handle.fate, 'create');

    for (const particle of result.particles) {
      const connections = Object.values(particle.connections);
      assert.lengthOf(connections, 1);
      const connection = connections[0] as HandleConnection;

      if (['ReaderB', 'ReaderC', 'ReaderD', 'WriterBCD'].includes(particle.name)) {
        assert.equal(connection.handle, handle);
      } else {
        assert.isUndefined(connection.handle);
      }
    }
  });
});
