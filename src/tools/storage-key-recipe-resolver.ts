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
import {Manifest} from '../runtime/manifest.js';
import {Loader} from '../platform/loader-web.js';
import {IsValidOptions, Recipe, RecipeComponent} from '../runtime/recipe/recipe.js';
import {ramDiskStorageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';
import {Arc} from '../runtime/arc.js';
import {RecipeResolver} from '../runtime/recipe/recipe-resolver.js';
import {CapabilitiesResolver} from '../runtime/capabilities-resolver.js';
import {Store} from '../runtime/storageNG/store.js';
import {Exists} from '../runtime/storageNG/drivers/driver.js';

/**
 * Responsible for resolving recipes with storage keys.
 */
export class StorageKeyRecipeResolver {
  private readonly runtime: Runtime;

  constructor(context: Manifest) {
    const loader = new Loader();
    this.runtime = new Runtime({loader, context});
  }

  /**
   * Produces resolved recipes with storage keys.
   *
   * @throws Error if recipe fails to resolve on first or second pass.
   * @yields Resolved recipes with storage keys
   */
  async resolve(): Promise<Recipe[]> {
    const recipes = [];
    for (const recipe of this.runtime.context.allRecipes) {
      const arc = this.runtime.newArc(this.getArcId(recipe), ramDiskStorageKeyPrefixForTest());
      const opts = {errors: new Map<Recipe | RecipeComponent, string>()};
      const resolved = await this.tryResolve(recipe, arc, opts);
      if (!resolved) {
        throw Error(`Recipe ${recipe.name} failed to resolve:\n${[...opts.errors.values()].join('\n')}`);
      }
      this.createStoresForCreateHandles(resolved, arc);
      if (!resolved.isResolved()) {
        throw Error(`Recipe ${resolved.name} did not properly resolve!\n${resolved.toString({showUnresolved: true})}`);
      }
      this.matchKeysToHandles(recipe);
      recipes.push(resolved)
    }
    return recipes;
  }

  /**
   * Resolves unresolved recipe or normalizes resolved recipe.
   *
   * @param recipe long-running or ephemeral recipe
   * @param arc Arc is associated with input recipe
   * @param opts contains `errors` map for reporting.
   */
  async tryResolve(recipe: Recipe, arc: Arc, opts?: IsValidOptions): Promise<Recipe | null> {
    const normalized = recipe.clone();
    const successful = normalized.normalize(opts);
    if (!successful) return null;
    if (normalized.isResolved()) return normalized;

    return await (new RecipeResolver(arc).resolve(recipe, opts));
  }

  /** Returns the arcId from annotations on the recipe when present. */
  getArcId(recipe: Recipe): string | null {
    for (const trigger of recipe.triggers) {
      for (const [key, val] of trigger) {
        if (key === 'arcId') {
          return val;
        }
      }
    }
    return null;
  }

  /**
   * Create stores with keys for all create handles.
   *
   * @param recipe should be long running.
   * @param arc Arc is associated with current recipe.
   */
  createStoresForCreateHandles(recipe: Recipe, arc: Arc) {
    const resolver = new CapabilitiesResolver({arcId: arc.id});
    for (const createHandle of recipe.handles.filter(h => h.fate === 'create')) {
      const storageKey = ramDiskStorageKeyPrefixForTest()(arc.id); // TODO(#4818) create the storage keys.
      const store = new Store({storageKey, exists: Exists.MayExist, type: createHandle.type, id: createHandle.id});
      arc.context.registerStore(store, createHandle.tags);
    }
  }

  /**
   * TODO(#4818) method to match `map` and `copy` fated handles with storage keys from `create` handles.
   *
   * @throws when a mapped handle is associated with too many stores (ambiguous mapping).
   * @throws when a mapped handle isn't associated with any store (no matches found).
   * @throws when handle is mapped to a handle from an ephemeral recipe.
   * @param recipe long-running or ephemeral recipe
   */
  matchKeysToHandles(recipe: Recipe) {
    recipe.handles
      .filter(h => h.fate === 'map' || h.fate === 'copy')
      .forEach(handle => {
        const matches = this.runtime.context.findHandlesById(handle.id)
          .filter(h => h.fate === 'create');

        if (matches.length === 0) {
          throw Error(`No matching handles found for ${handle.localName}.`);
        } else if (matches.length > 1) {
          throw Error(`More than one handle found for ${handle.localName}.`);
        }

        const match = matches[0];
        if (!match.recipe.isLongRunning) {
          throw Error(`Handle ${handle.localName} mapped to ephemeral handle ${match.localName}.`);
        }

        handle.storageKey = match.storageKey;
      });
  }
}
