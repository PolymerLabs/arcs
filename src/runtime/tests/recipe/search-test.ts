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
import {checkNotNull} from '../../testing/preconditions.js';
import {newRecipe, newSearch} from '../../recipe/lib-recipe.js';

describe('Recipe Search', () => {
  const createAndVerifyResolved = (search) => {
    assert.isTrue(search.isValid());
    search._normalize();
    assert.isTrue(search.isResolved());
    return search;
  };
  const createAndVerifyUnresolved = (search) => {
    assert.isTrue(search.isValid());
    search._normalize();
    assert.isFalse(search.isResolved());
    return search;
  };

  it('constructs new search', () => {
    let search = createAndVerifyUnresolved(newSearch('hello world'));
    assert.strictEqual('hello world', search.phrase);
    assert.deepEqual(['hello', 'world'], search.unresolvedTokens);
    assert.isEmpty(search.resolvedTokens);

    search = createAndVerifyResolved(newSearch('hello world', []));
    assert.strictEqual('hello world', search.phrase);
    assert.isEmpty(search.unresolvedTokens);
    assert.deepEqual(['hello', 'world'], search.resolvedTokens);

    search = createAndVerifyResolved(newSearch('hello world bye world', ['hello', 'world']));
    assert.strictEqual('hello world bye world', search.phrase);
    assert.deepEqual(['hello', 'world'], search.unresolvedTokens);
    assert.deepEqual(['bye', 'world'], search.resolvedTokens);
  });

  it('copies search to recipe', () => {
    const recipe = newRecipe();
    newSearch('hello world bye world')._copyInto(recipe);

    let search = checkNotNull(recipe.search);
    assert.strictEqual('hello world bye world', search.phrase);
    assert.deepEqual(['hello', 'world', 'bye', 'world'], search.unresolvedTokens);
    assert.isEmpty(search.resolvedTokens);
    let cloneRecipe = recipe.clone();
    assert(cloneRecipe.normalize());
    assert.isFalse(cloneRecipe.isResolved());

    newSearch('one two three', ['two'])._copyInto(recipe);
    search = checkNotNull(recipe.search);
    assert.strictEqual('hello world bye world one two three', search.phrase);
    assert.deepEqual(['hello', 'world', 'bye', 'world', 'two'], search.unresolvedTokens);
    assert.deepEqual(['one', 'three'], search.resolvedTokens);
    cloneRecipe = recipe.clone();
    assert(cloneRecipe.normalize());
    assert.isTrue(cloneRecipe.isResolved());
  });
});
