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
import {Type} from '../runtime/type.js';
import {IsValidOptions, Recipe, RecipeComponent} from '../runtime/recipe/recipe.js';
import {volatileStorageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';
import {CapabilitiesResolver} from '../runtime/capabilities-resolver.js';
import {IngressValidation} from '../runtime/policy/ingress-validation.js';
import {CreatableStorageKey} from '../runtime/storage/creatable-storage-key.js';
import {Store} from '../runtime/storage/store.js';
import {Exists} from '../runtime/storage/drivers/driver.js';
import {DatabaseStorageKey} from '../runtime/storage/database-storage-key.js';
import {Handle} from '../runtime/recipe/handle.js';
import {digest} from '../platform/digest-web.js';
import {VolatileStorageKey} from '../runtime/storage/drivers/volatile.js';

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
  private readonly ingressValidation: IngressValidation;

  constructor(context: Manifest, private randomSalt: string, policiesManifest?: Manifest|null) {
    this.runtime = new Runtime({context});
    DatabaseStorageKey.register();
    this.ingressValidation = policiesManifest
        ? new IngressValidation(policiesManifest.policies) : null;
  }

  /**
   * Produces resolved recipes with storage keys.
   *
   * @throws Error if recipe fails to resolve on first or second pass.
   * @returns Resolved recipes (with Storage Keys).
   */
  async resolve(): Promise<Recipe[]> {
    const opts = {errors: new Map<Recipe | RecipeComponent, string>()};

    const originalRecipes = [];
    // Clone all recipes.
    for (const originalRecipe of this.uniqueRecipes(this.runtime.context.allRecipes)) {
      originalRecipes.push(originalRecipe.clone());
    }

    const recipes = [];
    // Normalize all recipes.
    for (const recipe of originalRecipes) {
      if (!recipe.normalize(opts)) {
        throw new AllocatorRecipeResolverError(
            `Recipe ${recipe.name} failed to normalize:\n${[...opts.errors.values()].join('\n')}`);
      }
      recipes.push(recipe.clone());
    }

    // Map from a handle id to its `create` handle, all handles mapping it.
    const handleById = {};
    // Find all `create` handles of long running recipes.
    for (const recipe of recipes.filter(r => isLongRunning(r))) {
      const resolver = new CapabilitiesResolver({arcId: Id.fromString(findLongRunningArcId(recipe))});
      for (const createHandle of recipe.handles.filter(h => h.fate === 'create' && h.id)) {
        if (handleById[createHandle.id]) {
          throw new AllocatorRecipeResolverError(`
              More than one handle created with id '${createHandle.id}'.`);
        }
        // Skip volatile handles.
        const protocol = resolver.selectStorageKeyFactory(
            createHandle.capabilities, createHandle.id).protocol;
        if (protocol !== VolatileStorageKey.protocol) {
          handleById[createHandle.id] = {createHandle, handles: []};
        }
      }
    }
    for (const store of this.runtime.context.allStores) {
      if (handleById[store.id]) {
        throw new AllocatorRecipeResolverError(
            `Handle with ${store.id} already exists`);
      }
      handleById[store.id] = {store, handles: []};
    }

    // Find all `map` handles and add them to the map.
    for (const recipe of recipes) {
      for (const handle of recipe.handles) {
        if (handle.fate === 'use' || handle.fate === 'copy') {
          throw new AllocatorRecipeResolverError(
              `Recipe ${recipe.name} has a handle with unsupported '${handle.fate}' fate.`);
        }
        if (handle.fate !== 'map') continue;
        if (handleById[handle.id]) {
          handleById[handle.id]['handles'].push(handle);
        } else {
          throw new AllocatorRecipeResolverError(
              `No matching stores found for handle '${handle.id}' in recipe ${recipe.name}.`);
        }
      }
    }
    // Iterate over all handles in the recipe set that are shared across
    // multiple recipes, and compute their restricted type and apply them to
    // all relevant handles and connections.
    for (const handleId of Object.keys(handleById)) {
      // tslint:disable-next-line: no-any
      const {createHandle, store, handles} = handleById[handleId] as any;
      const restrictedType =
          this.restrictHandleType(handleId, [createHandle, store, ...handles].filter(h => !!h));
      assert(restrictedType.maybeEnsureResolved({restrictToMinBound: true}));
      if (createHandle) {
        createHandle.restrictType(restrictedType);
        for (const connection of createHandle.connections) {
          if (!connection.type.maybeEnsureResolved({restrictToMinBound: true})) {
            throw new AllocatorRecipeResolverError(
                `Cannot resolve type of ${connection.getQualifiedName()} in recipe ${connection.recipe.name}`);
          }
        }
      }
      for (const handle of handles) {
        handle.restrictType(restrictedType);
        for (const connection of handle.connections) {
          if (!connection.type.maybeEnsureResolved({restrictToMinBound: true})) {
            throw new AllocatorRecipeResolverError(
              `Cannot resolve type of ${connection.getQualifiedName()} in recipe ${connection.recipe.name}`);
          }
        }
      }
    }

    // Assign storage keys to all handles in the recipe.
    for (const recipe of recipes) {
      for (const createHandle of recipe.handles.filter(h => h.fate === 'create')) {
        await this.assignStorageKeys(createHandle);
        if (handleById[createHandle.id]) {
          for (const handle of handleById[createHandle.id].handles) {
            handle.storageKey = createHandle.storageKey;
          }
        }
      }
      // Validate ingress, if applicable.
      if (!this.ingressValidation) continue;
      const result = this.ingressValidation.validateIngressCapabilities(recipe);
      if (!result.success) {
        throw new AllocatorRecipeResolverError(
            `Failed ingress validation for plan ${recipe.name}: ${result.toString()}`);
      }
    }
    return recipes.filter(recipe => this.runtime.context.recipes.map(r => r.name).includes(recipe.name));
  }

  restrictHandleType(handleId: string, allHandles: Handle[]): Type {
    assert(allHandles.length > 0);
    assert(allHandles.every(h => h.type.tag === allHandles[0].type.tag));
    let restrictedType = null;
    for (const handle of allHandles) {
      if (restrictedType) {
        restrictedType = restrictedType.restrictTypeRanges(handle.type);
      } else {
        restrictedType = handle.type;
      }
    }
    return restrictedType;
  }

  async assignStorageKeys(handle: Handle): Promise<void> {
    assert(handle.type.maybeEnsureResolved({restrictToMinBound: true}));
    if (handle.fate === 'create') {
      if (isLongRunning(handle.recipe) && handle.id) {
        assert(!handle.storageKey); // store's storage key was set, but not the handle's
        const arcId = Id.fromString(findLongRunningArcId(handle.recipe));
        const resolver = new CapabilitiesResolver({arcId});
        assert(handle.type.isResolved());
        if (handle.type.getEntitySchema() === null) {
          throw new AllocatorRecipeResolverError(`Handle '${handle.id}' was not properly resolved.`);
        }
        const storageKey = await resolver.createStorageKey(
            handle.capabilities, handle.type, handle.id);
        handle.storageKey = storageKey;
      } else {  // ephemeral Arc
        assert(!handle.storageKey);
        handle.storageKey =
            new CreatableStorageKey(await this.createCreateHandleName(handle));
      }
    } else {  // handle.fate !=== 'create'
      if (handle.id) {
        assert(handle.storageKey instanceof CreatableStorageKey);
        handle.storageKey = this.runtime.context.findStoreById(handle.id).storageKey;
      }
    }
  }

  /** Generates a consistent handle id. */
  async createCreateHandleName(handle: Handle): Promise<string> {
    if (handle.id) return handle.id;
    if (!this.createHandleRegistry.has(handle)) {
      this.createHandleRegistry.set(handle, await digest(this.randomSalt + this.createHandleIndex++));
    }
    return this.createHandleRegistry.get(handle);
  }

  /** Returns set of recipes with unique names. */
  private uniqueRecipes(recipes: Recipe[]): Recipe[] {
    return recipes.filter((r, idx, self) => idx === self.findIndex((x) => x.name === r.name));
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
