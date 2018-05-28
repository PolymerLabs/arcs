/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {Manifest} from '../../manifest.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {CreateHandles} from '../../strategies/create-handles.js';
import {assert} from '../chai-web.js';

describe('CreateHandles', function() {
  const testManifest = async (recipeManifest, expectedToAssignFate) => {
    let manifest = (await Manifest.parse(`
      schema Thing

      particle Reader in 'test.js'
        in Thing foo
      particle Writer in 'test.js'
        out Thing foo
      particle ReadWriter in 'test.js'
        inout Thing foo

      ${recipeManifest}
    `));
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let results = await new CreateHandles(arc).generate(inputParams);

    if (!expectedToAssignFate) {
      assert.equal(results.length, 0);
    } else {
      assert.equal(results.length, 1);
      assert.isTrue(results[0].result.isResolved());
    }
  };

  const assertAssignsFate = async recipeManifest => testManifest(recipeManifest, true);
  const assertDoesntAssignFate = async recipeManifest => testManifest(recipeManifest, false);

  it('doesnt work with a single reader', async () => {
    await assertDoesntAssignFate(`
      recipe
        ? as handle
        Reader
          foo <- handle`);
  });

  it('doesnt work with a single writer', async () => {
    await assertDoesntAssignFate(`
      recipe
        ? as handle
        Writer
          foo -> handle`);
  });

  it('doesnt work with a single reader-writer', async () => {
    await assertDoesntAssignFate(`
      recipe
        ? as handle
        ReadWriter
          foo = handle`);
  });

  it('doesnt work with many readers', async () => {
    await assertDoesntAssignFate(`
      recipe
        ? as handle
        Reader
          foo <- handle
        Reader
          foo <- handle`);
  });

  it('doesnt work with many writers', async () => {
    await assertDoesntAssignFate(`
      recipe
        ? as handle
        Writer
          foo -> handle
        Writer
          foo -> handle`);
  });

  it('works with many reader-writers', async () => {
    await assertAssignsFate(`
      recipe
        ? as handle
        ReadWriter
          foo = handle
        ReadWriter
          foo = handle`);
  });

  it('works with one reader and one writer', async () => {
    await assertAssignsFate(`
      recipe
        ? as handle
        Reader
          foo <- handle
        Writer
          foo -> handle`);
  });

  it('works with multiple different connections', async () => {
    await assertAssignsFate(`
      recipe
        ? as handle
        Reader
          foo <- handle
        Writer
          foo -> handle
        ReadWriter
          foo = handle
        Reader
          foo <- handle`);
  });
});
