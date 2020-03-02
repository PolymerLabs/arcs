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
import {IsValidOptions, Recipe, RecipeComponent} from '../runtime/recipe/recipe.js';
import {CapabilitiesResolver, StorageKeyOptions} from '../runtime/capabilities-resolver.js';
import {RecipeResolver} from '../runtime/recipe/recipe-resolver.js';
import {Arc} from '../runtime/arc.js';
import {Loader} from '../platform/loader-web.js';
import {Store} from '../runtime/storageNG/store.js';
import {Exists} from '../runtime/storageNG/drivers/driver.js';
import {TestVolatileMemoryProvider} from '../runtime/testing/test-volatile-memory-provider.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../runtime/storageNG/drivers/ramdisk.js';
import {Capabilities} from '../runtime/capabilities.js';
import {ramDiskStorageKeyPrefixForTest, storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';


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


/**
 * Responsible for resolving recipes with storage keys.
 */
export class StorageKeyRecipeResolver {
  private readonly runtime: Runtime;

  constructor(context: Manifest) {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    // TODO(mmandlis): Use db key for persistent storage
    CapabilitiesResolver.registerDefaultKeyCreator(
      'persistent',
      Capabilities.persistent,
      ({arcId}: StorageKeyOptions) => new RamDiskStorageKey(arcId.toString())
    );

    this.runtime = new Runtime({loader, context, memoryProvider});
  }

  /**
   * Produces resolved recipes with storage keys.
   *
   * TODO(alxr): Apply to long-running recipes appropriately.
   * @throws Error if recipe fails to resolve on first or second pass.
   * @yields Resolved recipes with storage keys
   */
  async* resolve(): AsyncIterator<Recipe> {
    for (const r of this.runtime.context.allRecipes) {
      const arc = this.runtime.newArc(this.getArcId(r), ramDiskStorageKeyPrefixForTest());
      const opts = {errors: new Map<Recipe | RecipeComponent, string>()};
      const resolved = await this.resolveOrNormalize(r, arc, opts);
      if (!resolved) {
        throw Error(`Recipe ${r.name} failed to resolve:\n${[...opts.errors.values()].join('\n')}`);
      }
      this.createStoresForCreateHandles(resolved, arc);
      resolved.normalize();
      if (!resolved.isResolved()) {
        throw Error(`Recipe ${resolved.name} did not properly resolve!\n${resolved.toString({showUnresolved: true})}`);
      }
      yield resolved;
    }
  }

  /**
   * Resolves unresolved recipe or normalizes resolved recipe.
   *
   * @param recipe long-running or ephemeral recipe
   * @param arc Arc is associated with input recipe
   * @param opts contains `errors` map for reporting.
   */
  async resolveOrNormalize(recipe: Recipe, arc: Arc, opts?: IsValidOptions): Promise<Recipe | null> {
    const normed = recipe.clone();
    normed.normalize();
    if (normed.isResolved()) return normed;

    return await (new RecipeResolver(arc).resolve(recipe, opts));
  }

  /** @returns the arcId from annotations on the recipe when present. */
  getArcId(recipe: Recipe): string | null {
    const triggers: [string, string][][] = recipe.triggers;
    for (const trigger of triggers) {
      for (const pair of trigger) {
        if (pair[0] === 'arcId') {
          return pair[1];
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
  async createStoresForCreateHandles(recipe: Recipe, arc: Arc) {
    const resolver = new CapabilitiesResolver({arcId: arc.id});
    for (const ch of recipe.handles.filter(h => h.fate === 'create')) {
      const storageKey = ramDiskStorageKeyPrefixForTest()(arc.id); // TODO: actually create the storage keys.
      const store = new Store({storageKey, exists: Exists.MayExist, type: ch.type, id: ch.id});
      arc.context.registerStore(store, ch.tags);
    }
  }

  /**
   * WIP method to match `map` and `copy` fated handles with storage keys from `create` handles.
   *
   * @throws when a mapped handle is associated with too many stores (ambiguous mapping).
   * @throws when a mapped handle isn't associated with any store (no matches found).
   * @throws when handle is mapped to a handle from an ephemeral recipe.
   * @param recipe long-running or ephemeral recipe
   */
  matchKeysToHandles(recipe: Recipe) {
    recipe.handles
      .filter(h => h.fate === 'map' || h.fate === 'copy')
      .forEach(h => {
        const matches = this.runtime.context.findHandlesById(h.id)
          .filter(h => h.fate === 'create');

        if (matches.length !== 1) {
          const extra = matches.length > 1 ? 'Ambiguous handles' : 'No matching handles found';
          throw Error(`Handle ${h.localName} mapped improperly: ${extra}.`);
        }

        const match = matches[0];
        if (!match.recipe.isLongRunning) {
          throw Error(`Handle ${h.localName} mapped to ephemeral handle ${match.localName}.`);
        }

        h.storageKey = match.storageKey;
      });
  }
}



