/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';
import {Id} from '../runtime/id.js';
import {Runtime} from '../runtime/runtime.js';
import {Manifest} from '../runtime/manifest.js';
import {IsValidOptions, Recipe, RecipeComponent} from '../runtime/recipe/recipe.js';
import {volatileStorageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';
import {RecipeResolver} from '../runtime/recipe/recipe-resolver.js';
import {CapabilitiesResolver} from '../runtime/capabilities-resolver.js';
import {CreatableStorageKey} from '../runtime/storageNG/creatable-storage-key.js';
import {Store} from '../runtime/storageNG/store.js';
import {Exists} from '../runtime/storageNG/drivers/driver.js';
import {DatabaseStorageKey} from '../runtime/storageNG/database-storage-key.js';
import {Handle} from '../runtime/recipe/handle.js';
import {digest} from '../platform/digest-web.js';

export class AllocatorRecipeResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AllocatorRecipeResolverError';
  }
}

/**
 * Resolves recipes in preparation for the Allocator.
 *
 * The Allocator expects artifacts to be resolved in a way that is conducive for partition (particles should be
 * distributed to the proper ArcHost) and  lifecycle management (for arcs within ArcHosts).
 */
export class AllocatorRecipeResolver {
  private readonly runtime: Runtime;
  private readonly createHandleRegistry: Map<Handle, string> = new Map<Handle, string>();
  private createHandleIndex = 0;


  constructor(context: Manifest, private randomSalt: string) {
    this.runtime = new Runtime({context});
    DatabaseStorageKey.register();
  }

  /**
   * Produces resolved recipes with storage keys.
   *
   * @throws Error if recipe fails to resolve on first or second pass.
   * @returns Resolved recipes (with Storage Keys).
   */
  async resolve(): Promise<Recipe[]> {
    const opts = {errors: new Map<Recipe | RecipeComponent, string>()};

    // First pass: validate recipes and create stores
    const firstPass = [];
    for (const recipe of this.runtime.context.allRecipes) {
      this.validateHandles(recipe);

      if (!recipe.normalize(opts)) {
        throw new AllocatorRecipeResolverError(
          `Recipe ${recipe.name} failed to normalize:\n${[...opts.errors.values()].join('\n')}`);
      }

      let withStores = recipe;
      if (isLongRunning(recipe)) {
        withStores = await this.createStoresForCreateHandles(recipe);
      }

      firstPass.push(withStores);
    }

    // Second pass: resolve and assign creatable storage keys
    const recipes = [];
    for (let recipe of firstPass) {
      // Only include recipes from primary (non-imported) manifest
      if (!this.runtime.context.recipes.map(r => r.name).includes(recipe.name)) continue;

      recipe = await this.tryResolve(recipe, opts);
      recipe = await this.assignCreatableStorageKeys(recipe);
      recipe.normalize();

      recipes.push(recipe);
    }
    return recipes;
  }

  /**
   * Resolves unresolved recipe or normalizes resolved recipe.
   *
   * @param recipe long-running or ephemeral recipe
   */
  async tryResolve(recipe: Recipe, opts: IsValidOptions): Promise<Recipe | null> {

    if (recipe.isResolved()) return recipe;

    const arcId = findLongRunningArcId(recipe);
    const arc = this.runtime.newArc(
      arcId, volatileStorageKeyPrefixForTest(), arcId ? {id: Id.fromString(arcId)} : undefined);

    const resolvedRecipe = await (new RecipeResolver(arc).resolve(recipe, opts));
    if (!resolvedRecipe) {
      throw new AllocatorRecipeResolverError(
        `Recipe ${recipe.name} failed to resolve:\n${[...opts.errors.values()].join('\n')}`);
    }
    assert(resolvedRecipe.isResolved());
    return resolvedRecipe;
  }

  /**
   * Instantiates CreatableStorageKeys for stores that need to be separate for each recipe instance.
   */
  async assignCreatableStorageKeys(recipe: Recipe): Promise<Recipe> {
    // Recipe is normalized at this stage, we need to modify it further.
    recipe = recipe.clone();

    for (const handle of recipe.handles) {
      if (handle.fate !== 'create' || handle.storageKey) continue;

      handle.storageKey = new CreatableStorageKey(
        await this.createCreateHandleName(handle)
      );
    }

    return recipe;
  }

  /** Generates a consistent handle id. */
  async createCreateHandleName(handle: Handle): Promise<string> {
    if (handle.id) return handle.id;
    if (!this.createHandleRegistry.has(handle)) {
      this.createHandleRegistry.set(handle, await digest(this.randomSalt + this.createHandleIndex++));
    }
    return this.createHandleRegistry.get(handle);
  }

  /**
   * Create stores with keys for all create handles with ids.
   *
   * @param recipe should be long running.
   */
  async createStoresForCreateHandles(recipe: Recipe): Promise<Recipe> {
    const arcId = Id.fromString(findLongRunningArcId(recipe));
    const resolver = new CapabilitiesResolver({arcId});
    const cloneRecipe = recipe.clone();
    for (const createHandle of cloneRecipe.handles.filter(h => h.fate === 'create' && !!h.id)) {
      if (createHandle.type.hasVariable && !createHandle.type.isResolved()) {
        assert(createHandle.type.maybeEnsureResolved());
        assert(createHandle.type.isResolved());
      }

      if (createHandle.type.getEntitySchema() === null) {
        throw new AllocatorRecipeResolverError(`Handle '${createHandle.id}' was not properly resolved.`);
      }

      const storageKey = await resolver.createStorageKey(
          createHandle.capabilities, createHandle.type, createHandle.id);
      const store = new Store(createHandle.type, {
        storageKey,
        exists: Exists.MayExist,
        id: createHandle.id
      });
      this.runtime.context.registerStore(store, createHandle.tags);
      createHandle.storageKey = storageKey;
    }
    assert(cloneRecipe.normalize());
    return cloneRecipe;
  }

  /**
   * Checks that handles are existent, disambiguous, and initiated by a long-running arc.
   *
   * @throws when a map or copy handle is associated with too many stores (ambiguous mapping).
   * @throws when a map or copy handle isn't associated with any store (no matches found).
   * @throws when a map or copy handle is associated with a handle from an ephemeral recipe.
   * @param recipe long-running or ephemeral recipe
   */
  validateHandles(recipe: Recipe) {
    for (const handle of recipe.handles.filter(handle => handle.fate === 'map' || handle.fate === 'copy')) {
      const matches = this.runtime.context.findHandlesById(handle.id)
        .filter(h => h.fate === 'create');

      if (matches.length === 0) {
        throw new AllocatorRecipeResolverError(`No matching handles found for ${handle.localName}.`);
      } else if (matches.length > 1) {
        throw new AllocatorRecipeResolverError(`More than one handle found for ${handle.localName}.`);
      }

      const match = matches[0];
      if (!isLongRunning(match.recipe)) {
        throw new AllocatorRecipeResolverError(
          `Handle ${handle.localName} mapped to ephemeral handle '${match.id}'.`
        );
      }
    }
  }
}

/** Returns true if input recipe is for a long-running arc. */
export function isLongRunning(recipe: Recipe): boolean {
  return !!findLongRunningArcId(recipe);
}

/** Returns arcId for long-running arcs, null otherwise. */
export function findLongRunningArcId(recipe: Recipe): string | null {
  const arcIdAnnotation = recipe.getAnnotation('arcId');
  return arcIdAnnotation ? Object.values(arcIdAnnotation.params)[0].toString() : null;
}
