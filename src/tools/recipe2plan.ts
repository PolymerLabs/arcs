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
import {PlanGenerator} from './plan-generator.js';


/**
 * Generates Kotlin Plans from recipes in an arcs manifest.
 *
 * @param path path/to/manifest.arcs
 * @return Generated Kotlin code.
 */
export async function recipe2plan(path: string): Promise<string> {
  const manifest = await Runtime.parseFile(path);

  const recipes = new StorageKeyRecipeResolver(manifest).resolve();

  const generator = new PlanGenerator(recipes);

  return await generator.generate();
}



