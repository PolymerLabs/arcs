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
import {Recipe, RecipeComponent} from '../runtime/recipe/recipe.js';
import {CapabilitiesResolver} from '../runtime/capabilities-resolver.js';
import {ArcId, IdGenerator} from '../runtime/id.js';
import {RecipeResolver} from '../runtime/recipe/recipe-resolver.js';
import {Arc} from '../runtime/arc.js';
import {SlotComposer} from '../runtime/slot-composer.js';
import {Loader} from '../platform/loader-web.js';
import {Store} from '../runtime/storageNG/store.js';
import {Exists} from '../runtime/storageNG/drivers/driver.js';
import {Handle} from '../runtime/recipe/handle.js';


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
    for (const r of this.manifest.allRecipes) {
      const arcId = IdGenerator.newSession().newArcId(this.getArcId(r.triggers));
      if (arcId === null) {
        throw Error(`ArcId is invalid.`);
      }

      const arc = new Arc({id: arcId, slotComposer: new SlotComposer(), loader: new Loader(), context: this.manifest});
      const resolver = new CapabilitiesResolver({arcId});
      this.createDummyStores(r, resolver);

      const opts = {errors: new Map<Recipe | RecipeComponent, string>()};
      const rPrime = await (new RecipeResolver(arc).resolve(r, opts));
      if (!rPrime) {
        throw Error(`Recipe ${r.name} failed to resolve:\n` +
                    [...opts.errors.values()].join('\n'))
      }
      this.assignStorageKeys(rPrime, resolver); // or resolve mapping
      rPrime.normalize();
      if (!rPrime.isResolved()) {
        throw Error(`Recipe ${rPrime.name} did not properly resolve!`);
      }
      yield rPrime;
    }
  }

  /** Create storage keys for create handles, matches them to map handles. */
  assignStorageKeys(recipe: Recipe, resolver: CapabilitiesResolver) {
    this.createKeysForCreateHandles(recipe, resolver);
    this.matchKeysToHandles(recipe);
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
   * @param resolver CapabilitiesResolver should be associated with long-running-arc's ArcId.
   */
  createKeysForCreateHandles(recipe: Recipe, resolver: CapabilitiesResolver) {
    recipe.handles
      .filter(h => h.fate === 'create')
      .forEach(ch => ch.storageKey = resolver.createStorageKey(ch.capabilities));
  }

  createDummyStores(recipe: Recipe, resolver: CapabilitiesResolver) {
    recipe.handles
      .filter(h => h.fate === 'create')
      .forEach(ch => {
        const storageKey = resolver.createStorageKey(ch.capabilities);
        const store = new Store({storageKey, exists: Exists.ShouldCreate, type: ch.type, id: ch.id});
        this.manifest.registerStore(store, ch.tags);
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



