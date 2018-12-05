/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Search} from '../../recipe/search.js';
import {Recipe} from '../../recipe/recipe.js';
import {assert} from '../chai-web.js';

describe('Recipe Search', function() {
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
    let search = createAndVerifyUnresolved(new Search('hello world'));
    assert.equal('hello world', search.phrase);
    assert.deepEqual(['hello', 'world'], search.unresolvedTokens);
    assert.isEmpty(search.resolvedTokens);

    search = createAndVerifyResolved(new Search('hello world', []));
    assert.equal('hello world', search.phrase);
    assert.isEmpty(search.unresolvedTokens);
    assert.deepEqual(['hello', 'world'], search.resolvedTokens);

    search = createAndVerifyResolved(new Search('hello world bye world', ['hello', 'world']));
    assert.equal('hello world bye world', search.phrase);
    assert.deepEqual(['hello', 'world'], search.unresolvedTokens);
    assert.deepEqual(['bye', 'world'], search.resolvedTokens);
  });

  it('copies search to recipe', () => {
    const recipe = new Recipe();
    new Search('hello world bye world')._copyInto(recipe);

    assert.equal('hello world bye world', recipe.search.phrase);
    assert.deepEqual(['hello', 'world', 'bye', 'world'], recipe.search.unresolvedTokens);
    assert.isEmpty(recipe.search.resolvedTokens);
    let cloneRecipe = recipe.clone();
    assert(cloneRecipe.normalize());
    assert.isFalse(cloneRecipe.isResolved());

    new Search('one two three', ['two'])._copyInto(recipe);    
    assert.equal('hello world bye world one two three', recipe.search.phrase);
    assert.deepEqual(['hello', 'world', 'bye', 'world', 'two'], recipe.search.unresolvedTokens);
    assert.deepEqual(['one', 'three'], recipe.search.resolvedTokens);
    cloneRecipe = recipe.clone();
    assert(cloneRecipe.normalize());
    assert.isTrue(cloneRecipe.isResolved());
  });
});
