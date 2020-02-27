/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
describe('recipe2plan', () => {
  it('Long + Long: If ReadingRecipe is long running, it is a valid use case.', function(){});
  it('Short + Short: If WritingRecipe is short lived, it is not valid.', function(){});
  it('Short + Long: If WritingRecipe is short lived and Reading is long lived, it is not valid.', function(){});
  it('Invalid Type: If Reader reads {name: Text, age: Number} it is not valid', function(){});
  it('No arc id: If arcId of WritingRecipe is not there, it is not valid.', function(){});
  it('No handleId: If id of handle in WritingRecipe is not provided, it is not valid.', function(){});
  it('Ambiguous handle: If there are 2 WritingRecipes creating the same handle, it is not valid.', function(){});
  it('Ambiguous handle + tag disambiguation: If there are 2 WritingRecipes creating the same handle but with different tags and mapping uses one of the tags, it is valid.', function(){});
  it('No Handle: If there is no writing handle, it is not valid.', function(){});
});
