/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Runtime} from '../runtime/runtime.js';
import {Recipe} from '../runtime/recipe/recipe.js';
import {StorageKeyRecipeResolver} from './storage-key-recipe-resolver.js';


/**
 * Generates Kotlin Plans from recipes in an arcs manifest.
 *
 * @param path path/to/manifest.arcs
 * @return Generated Kotlin code.
 */
export async function recipe2plan(path: string): Promise<string> {
  const manifest = await Runtime.parseFile(path);

  const recipes = new StorageKeyRecipeResolver(manifest).resolve();

  const plans = await generatePlans(recipes);

  return plans.join('\n');
}


/**
 * Converts each resolved recipes into a Kotlin Plan class.
 *
 * @param resolutions A series of resolved recipes.
 * @return List of generated Kotlin plans
 */
async function generatePlans(resolutions: AsyncIterator<Recipe>): Promise<string[]> {
  // TODO Implement
  return [''];
}

