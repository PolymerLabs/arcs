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
import {Recipe} from '../runtime/recipe/recipe.js';
import {CapabilitiesResolver} from '../runtime/capabilities-resolver.js';
import {IdGenerator} from '../runtime/id.js';


/** Reads a manifest and outputs generated Kotlin plans. */
export async function recipe2plan(path: string): Promise<string> {

  const manifest = await Runtime.parseFile(path);

  const resolutions = await resolveManifest(manifest);

  const plans = generatePlans(resolutions);

  return plans.join('\n');
}

interface Resolution {
}

function generatePlans(resolutions: Resolution[]): string[] {
  return [''];
}

export async function resolveManifest(manifest: Manifest): Promise<Resolution[]> {
  const recipeResolver = new RecipeResolver(manifest);
  recipeResolver.resolve();

  return [{}];
}

class RecipeResolver {
  readonly longRunningRecipes: Recipe[];
  constructor(private manifest: Manifest) {
    this.longRunningRecipes = manifest.allRecipes.filter(r => this.isLongRunning(r.triggers));
  }

  resolve() {
    for (const r of this.longRunningRecipes) {
      r.normalize();
      this._resolve(r);
    }
  }

  _resolve(recipe: Recipe) {
    const arcId = IdGenerator.newSession().newArcId(this.getArcId(recipe.triggers));
    if (arcId === null) return;

    const resolver = new CapabilitiesResolver({arcId});

    this.createKeysForCreatedHandles(recipe, resolver);
    this.matchKeysForMappedHandles(recipe);

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
   * TODO(alxr) confirm with Maria how to configure storage keys correctly
   *
   * @param recipe Should be a recipe for a long-running Arc
   * @param resolver CapabilitiesResolver should be associated with long-running-arc's ArcId.
   */
  createKeysForCreatedHandles(recipe: Recipe, resolver: CapabilitiesResolver) {
    recipe.handles
      .filter(h => h.fate === 'create')
      .forEach(ch => ch.storageKey = resolver.createStorageKey(ch.capabilities));
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
  matchKeysForMappedHandles(recipe: Recipe) {
    recipe.handles
      .filter(h => h.fate == 'map')
      .forEach(h => {
        let matches = this.manifest.findHandlesByType(h.type, {tags: h.tags, fates: ['create'], subtype: true});
        if (h.id) {
          matches = matches.filter(matchHandle => matchHandle.id === h.id);
        }

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



