/**
 * @license
 * Copyright 2019 Google LLC.
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
import {ArcId, IdGenerator} from '../runtime/id.js';
import {RecipeResolver} from '../runtime/recipe/recipe-resolver.js';
import {Arc} from '../runtime/arc.js';
import {SlotComposer} from '../runtime/slot-composer.js';
import {Loader} from '../platform/loader-web.js';
import {Store} from '../runtime/storageNG/store.js';
import {Exists} from '../runtime/storageNG/drivers/driver.js';
import {Handle} from '../runtime/recipe/handle.js';
import {TestVolatileMemoryProvider} from '../runtime/testing/test-volatile-memory-provider.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../runtime/storageNG/drivers/ramdisk.js';
import {Capabilities} from '../runtime/capabilities.js';
import {ramDiskStorageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';


/** Reads a manifest and outputs generated Kotlin plans. */
export async function recipe2plan(path: string): Promise<string> {

  const manifest = await Runtime.parseFile(path);

  const recipes = new StorageKeyRecipeResolver(manifest).resolve();

  const plans = await generatePlans(recipes);

  return plans.join('\n');
}


async function generatePlans(resolutions: AsyncIterator<Recipe>): Promise<string[]> {
  return [''];
}


export class StorageKeyRecipeResolver {
  constructor(private manifest: Manifest) {
  }

  /**
   * 1. Resolves all recipes  with RecipeResolver, clone everything
   * Later: If create handles are not tied to arc (volatile) and Don't have IDs, log a warning
   * 2. assign keys, bikeshed name
   * 3. normalize all recipes again
   * 4. assert all are still resolved
   * Ephemeral Arcs can map to long running.
   */
  // TODO(alxr) if create handles are not tied to arc (volatile) and don't have IDs, log a warning
  async* resolve(): AsyncIterator<Recipe> {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    // TODO(mmandlis): Use db key for persistent storage
    CapabilitiesResolver.registerDefaultKeyCreator(
      "persistent",
      Capabilities.persistent,
      ({arcId}: StorageKeyOptions) => new RamDiskStorageKey(arcId.toString())
    );

    const runtime = new Runtime({loader, context: this.manifest, memoryProvider});

    for (const r of runtime.context.allRecipes) {
      const arc = runtime.newArc(this.getArcId(r.triggers), ramDiskStorageKeyPrefixForTest());
      const opts = {errors: new Map<Recipe | RecipeComponent, string>()};
      const rPrime = await this.resolveOrNormalize(r, arc, opts);
      if (!rPrime) {
        throw Error(`Recipe ${r.name} failed to resolve:\n` +
                    [...opts.errors.values()].join('\n'))
      }
      this.createKeysForCreateHandles(rPrime, arc);
      // this.matchKeysToHandles(rPrime);
      rPrime.normalize();
      if (!rPrime.isResolved()) {
        throw Error(`Recipe ${rPrime.name} did not properly resolve!\n${rPrime.toString({showUnresolved: true})}`);
      }
      yield rPrime;
    }
  }

  async resolveOrNormalize(recipe: Recipe, arc: Arc, opts?: IsValidOptions): Promise<Recipe | null> {
    const normed = recipe.clone();
    normed.normalize();
    console.log(`is resolved:${normed.name}:${normed.isResolved()}`);
    if(normed.isResolved()) return normed;

    return await (new RecipeResolver(arc).resolve(recipe, opts));
  }


  /** @returns the arcId from annotations on the recipe. */
  getArcId(triggers: [string, string][][]): string | null {
    for (const trigger of triggers) {
      for (const pair of trigger) {
        if (pair[0] === 'arcId') {
          return pair[1];
        }
      }
    }
    return null;
  }

  /** Predicate determines if we should create storage keys on a recipe. */
  isLongRunning(triggers: [string, string][][]): boolean {
    let hasArcId = false;
    let isLaunchedAtStartup = false;

    for (const trigger of triggers) {
      for (const pair of trigger) {
        if (pair[0] === 'arcId') {
          hasArcId = true;
        }
        if (pair[0] === 'launch' && pair[1] === 'startup') {
          isLaunchedAtStartup = true;
        }
      }
    }

    return hasArcId && isLaunchedAtStartup;
  }

  /**
   * Assigns storage keys to all create handles.
   *
   * @param recipe Should be a recipe for a long-running Arc
   * @param arc
   */
  createKeysForCreateHandles(recipe: Recipe, arc: Arc) {
    const resolver = new CapabilitiesResolver({arcId: arc.id});
    recipe.handles
      .filter(h => h.fate === 'create')
      .forEach(ch => {
        console.log(`${ch.localName}:${ch.id}:${ch.type}`);
        const storageKey = resolver.createStorageKey(ch.capabilities);
        const store = new Store({storageKey, exists: Exists.MayExist, type: ch.type, id: ch.id});
        arc.context.registerStore(store, ch.tags);
        // ch.storageKey = storageKey;
      });
  }

  createDummyStores(recipe: Recipe, arc: Arc) {
    const resolver = new CapabilitiesResolver({arcId: arc.id});
    recipe.handles
      .forEach(h => {
        const store = new Store({storageKey: ramDiskStorageKeyPrefixForTest()(arc.id),
          exists: Exists.MayExist, type: h.type, id: h.id});
        arc.context.registerStore(store, h.tags);
      });
  }

  /**
   * For every mapped handle, we need to find a `create` handle that matches by type and ID
   *  (ID may or may not be present). Need to use the fn `findStoresByType` on manifests to find a match
   *
   *  When we find a match, we need to set the storage key on the mapped handle on the Found Create Handle
   *  (found via findStoresByType).
   *
   * Likely don't have to support raw stores. If need to solve, check how runtime does this If need to solve, check how
   * runtime does this.
   *
   * @throws when a mapped handle is associated with too many stores (ambiguous mapping).
   * @throws when a mapped handle isn't associated with any store (no matches found).
   * @throws when handle is mapped to a handle from an ephemeral recipe.
   * @param recipe
   */
  // TODO: create handles need IDs if they are being mapped
  matchKeysToHandles(recipe: Recipe) {
    recipe.handles
      .filter(h => h.fate === 'map' || h.fate === 'copy')
      .forEach(h => {
        const matches = this.manifest.findHandlesById(h.id)
          .filter(h => h.fate === 'create');

        if (matches.length !== 1) {
          const extra = matches.length > 1 ? 'Ambiguous handles' : 'No matching handles found';
          throw Error(`Handle ${h.localName} mapped improperly: ${extra}.`);
        }

        const match = matches[0];
        if (!this.isLongRunning(match.recipe.triggers)) {
          throw Error(`Handle ${h.localName} mapped to ephemeral handle ${match.localName}.`);
        }

        h.storageKey = match.storageKey;
      });
  }
}



