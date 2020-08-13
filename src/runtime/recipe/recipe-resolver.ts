/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../arc.js';
import {Action, GenerateParams} from './walker.js';
import {ConsumeSlotConnectionSpec} from '../particle-spec.js';
import {Handle} from './handle.js';
import {Particle} from './particle.js';
import {RecipeUtil} from './recipe-util.js';
import {RecipeWalker} from './recipe-walker.js';
import {Recipe, IsValidOptions} from './recipe.js';
import {ConnectionConstraint, InstanceEndPoint} from './connection-constraint.js';
import {SlotConnection} from './slot-connection.js';
import {SlotUtils} from './slot-utils.js';
import {Continuation} from './walker.js';

export class ResolveWalker extends RecipeWalker {
  private options: IsValidOptions;
  private readonly arc: Arc;

  constructor(tactic, arc, options?) {
    super(tactic);
    this.arc = arc;
    this.options = options;
  }

  onHandle(recipe: Recipe, handle: Handle): Continuation<Recipe, Handle[]> {
    const error = (label: string) => {
      if (this.options && this.options.errors) {
        this.options.errors.set(handle, label);
      }
      return [];
    };
    if (handle.fate === '`slot' || handle.fate === 'join') {
      return [];
    }
    if (handle.type.slandleType()) {
      return [];
    }
    const arc = this.arc;
    if ((handle.connections.length === 0 && !handle.isJoined) ||
        (handle.id && handle.storageKey) || (!handle.type) ||
        (!handle.fate)) {
      return error('No connections to handle or missing handle information');
    }

    let mappable;
    if (!handle.id) {
      // Handle doesn't have an ID, finding by type and tags.
      const counts = RecipeUtil.directionCounts(handle);
      switch (handle.fate) {
        case 'use':
          mappable = arc.findStoresByType(handle.type, {tags: handle.tags});
          break;
        case 'map':
        case 'copy':
          mappable = arc.context.findStoresByType(handle.type, {tags: handle.tags, subtype: true});
          break;
        case 'create':
        case '?':
          mappable = [];
          break;
        default:
          throw new Error(`unexpected fate ${handle.fate}`);
      }
    } else if (!handle.storageKey) {
      // Handle specified by the ID, but not yet mapped to storage.
      let storeById;
      switch (handle.fate) {
        case 'use':
          storeById = arc.findStoreById(handle.id);
          break;
        case 'map':
        case 'copy':
          storeById = arc.context.findStoreById(handle.id);
          break;
        case 'create':
        case '?':
          break;
        default:
          throw new Error(`unexpected fate ${handle.fate}`);
      }
      if (storeById) {
        mappable = [storeById];
      } else {
        return error(`cannot find associated store with handle id '${handle.id}'`);
      }
    }

    if (mappable.length === 0) {
      return error('Cannot find a handle matching requested type and tags.');
    }
    mappable = mappable.filter(incomingHandle => {
      for (const existingHandle of recipe.handles) {
        if (incomingHandle.id === existingHandle.id &&
            existingHandle !== handle) {
          return false;
        }
      }
      return true;
    });

    if (mappable.length === 0) {
      // TODO(jopra): Reconsider this behaviour.
      // Tracked at https://github.com/PolymerLabs/arcs/issues/3389
      return error('The only handles matching the requested type and tags are already present in this recipe');
    }
    return mappable.map(store => ((recipe, updateHandle: Handle) => {
      updateHandle.mapToStorage(store);
      return 0;
    }));
  }

  onSlotConnection(_recipe: Recipe, slotConnection: SlotConnection): Continuation<Recipe, SlotConnection[]> {
    const error = (label: string) => {
      if (this.options && this.options.errors) {
        this.options.errors.set(slotConnection, label);
      }
      return [];
    };
    const arc = this.arc;
    if (slotConnection.isConnected()) {
      return error('Slot connection is already connected');
    }

    const slotSpec = slotConnection.getSlotSpec();
    const particle = slotConnection.particle;
    const {local, remote} = SlotUtils.findAllSlotCandidates(particle, slotSpec, arc);

    const allSlots = [...local, ...remote];

     // SlotUtils handles a multi-slot case.
    if (allSlots.length !== 1) {
      return error('There are multiple matching slots (match is ambiguous)');
    }

    const selectedSlot = allSlots[0];
    return (recipe, slotConnection) => {
      SlotUtils.connectSlotConnection(slotConnection, selectedSlot);
      return 1;
    };
  }

  onPotentialSlotConnection(_recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec) {
    const error = (label: string) => {
      if (this.options && this.options.errors) {
        this.options.errors.set(particle, label);
      }
      return [];
    };
    const arc = this.arc;
    const {local, remote} = SlotUtils.findAllSlotCandidates(particle, slotSpec, arc);
    const allSlots = [...local, ...remote];

    // SlotUtils handles a multi-slot case.
    if (allSlots.length !== 1) {
      return error('There are multiple matching slots for this slot spec (match is ambiguous)');
    }

    const selectedSlot = allSlots[0];
    return (_recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec) => {
      const newSlotConnection = particle.addSlotConnection(slotSpec.name);
      SlotUtils.connectSlotConnection(newSlotConnection, selectedSlot);
      return 1;
    };
  }
  // TODO(lindner): add typeof checks here and figure out where handle is coming from.
  onObligation(recipe: Recipe, obligation: ConnectionConstraint) {
    // TODO(jopra): Log errors from here.
    const fromParticle: Particle = (obligation.from as InstanceEndPoint).instance;
    const toParticle: Particle = (obligation.to as InstanceEndPoint).instance;
    for (const fromConnection of Object.values(fromParticle.connections)) {
      for (const toConnection of Object.values(toParticle.connections)) {
        if (fromConnection.handle && fromConnection.handle === toConnection.handle) {
          return (recipe, obligation) => {
            recipe.removeObligation(obligation);
            return 1;
          };
        }
      }
    }
    return [];
  }
}

export class ResolveRecipeAction extends Action<Recipe> {
  private options: IsValidOptions;
  withOptions(options: IsValidOptions) {
    this.options = options;
  }
  async generate(inputParams: GenerateParams<Recipe>) {
    return ResolveWalker.walk(this.getResults(inputParams),
      new ResolveWalker(ResolveWalker.Permuted, this.arc, this.options), this);
  }
}

// Provides basic recipe resolution for recipes against a particular arc.
export class RecipeResolver {
  private resolver: ResolveRecipeAction;
  constructor(arc: Arc) {
    this.resolver = new ResolveRecipeAction(arc);
  }

  // Attempts to run basic resolution on the given recipe. Returns a new
  // instance of the recipe normalized and resolved if possible. Returns null if
  // normalization or attempting to resolve slot connection fails.
  async resolve(recipe: Recipe, options?: IsValidOptions): Promise<Recipe | null> {
    recipe = recipe.clone();
    if (!recipe.normalize(options)) {
      console.warn(`could not normalize a recipe: ${
              [...options.errors.values()].join('\n')}.\n${recipe.toString()}`);
      return null;
    }

    this.resolver.withOptions(options); // Smuggle error data around
    const result = await this.resolver.generateFrom([{result: recipe, score: 1}]);
    if (result.length === 0) {
      if (options && options.errors) {
        options.errors.set(recipe, 'Resolver generated 0 recipes');
      }
      return null;
    }
    return result[0].result;
  }
}
