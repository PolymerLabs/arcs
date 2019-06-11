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
import {Action} from './walker.js';
import {ConsumeSlotConnectionSpec} from '../particle-spec.js';
import {Direction} from '../manifest-ast-nodes.js';
import {Handle} from './handle';
import {Particle} from './particle.js';
import {RecipeUtil} from './recipe-util.js';
import {RecipeWalker} from './recipe-walker.js';
import {Recipe} from './recipe.js';
import {SlotConnection} from './slot-connection.js';
import {SlotUtils} from './slot-utils.js';

export class ResolveWalker extends RecipeWalker {
  private readonly arc: Arc;

  constructor(tactic, arc) {
    super(tactic);
    this.arc = arc;
  }

  onHandle(recipe: Recipe, handle: Handle) {
    const arc = this.arc;
    if (handle.connections.length === 0 ||
        (handle.id && handle.storageKey) || (!handle.type) ||
        (!handle.fate)) {
      return undefined;
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
        case '`slot':
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
        case '`slot':
        case '?':
          break;
        default:
          throw new Error(`unexpected fate ${handle.fate}`);
      }
      mappable = storeById ? [storeById] : [];
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

    if (mappable.length === 1) {
      return (recipe, handle) => {
        handle.mapToStorage(mappable[0]);
        return 0;
      };
    }
    return undefined;
  }

  onSlotConnection(_recipe: Recipe, slotConnection: SlotConnection) {
    const arc = this.arc;
    if (slotConnection.isConnected()) {
      return undefined;
    }

    const slotSpec = slotConnection.getSlotSpec();
    const particle = slotConnection.particle;
    const {local, remote} = SlotUtils.findAllSlotCandidates(particle, slotSpec, arc);

    const allSlots = [...local, ...remote];

     // SlotUtils handles a multi-slot case.
    if (allSlots.length !== 1) {
      return undefined;
    }

    const selectedSlot = allSlots[0];
    return (recipe, slotConnection) => {
      SlotUtils.connectSlotConnection(slotConnection, selectedSlot);
      return 1;
    };
  }

  onPotentialSlotConnection(_recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec) {
    const arc = this.arc;
    const {local, remote} = SlotUtils.findAllSlotCandidates(particle, slotSpec, arc);
    const allSlots = [...local, ...remote];

    // SlotUtils handles a multi-slot case.
    if (allSlots.length !== 1) {
      return undefined;
    }

    const selectedSlot = allSlots[0];
    return (_recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec) => {
      const newSlotConnection = particle.addSlotConnection(slotSpec.name);
      SlotUtils.connectSlotConnection(newSlotConnection, selectedSlot);
      return 1;
    };
  }
  // TODO(lindner): add typeof checks here and figure out where handle is coming from.
  onObligation(recipe: Recipe, obligation: {from, to, direction: Direction}) {
    const fromParticle = obligation.from.instance;
    const toParticle = obligation.to.instance;
    for (const fromConnection of Object.values(fromParticle.connections)) {
      for (const toConnection of Object.values(toParticle.connections)) {
        // @ts-ignore
        if (fromConnection.handle && fromConnection.handle === toConnection.handle) {
          return (recipe, obligation) => {
            recipe.removeObligation(obligation);
            return 1;
          };
        }
      }
    }
    return undefined;
  }
}

export class ResolveRecipeAction extends Action<Recipe> {

  async generate(inputParams) {
    return ResolveWalker.walk(this.getResults(inputParams),
      new ResolveWalker(ResolveWalker.Permuted, this.arc), this);
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
  async resolve(recipe) {
    recipe = recipe.clone();
    const options = {errors: new Map()};
    if (!recipe.normalize(options)) {
      console.warn(`could not normalize a recipe: ${
              [...options.errors.values()].join('\n')}.\n${recipe.toString()}`);
      return null;
    }

    const result = await this.resolver.generate(
        {generated: [{result: recipe, score: 1}], terminal: []});
    return (result.length === 0) ? null : result[0].result;
  }
}
