/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from './manifest.js';
import {Arc} from './arc.js';
import {SlotComposer} from './slot-composer.js';
import {Descendant, Strategizer, Strategy} from './strategizer/strategizer.js';
import {StrategyExplorerAdapter} from '../debug/strategy-explorer-adapter.js';
import {Tracing} from '../../tracelib/trace.js';
import {ConvertConstraintsToConnections} from './strategies/convert-constraints-to-connections.js';
import {MatchFreeHandlesToConnections} from './strategies/match-free-handles-to-connections.js';
import {ResolveRecipe} from './strategies/resolve-recipe.js';
import {CreateHandleGroup} from './strategies/create-handle-group.js';
import {AddMissingHandles} from './strategies/add-missing-handles.js';
import * as Rulesets from './strategies/rulesets.js';
import {MapSlots} from './strategies/map-slots.js';
import {DevtoolsConnection} from '../debug/devtools-connection.js';
import {Recipe} from './recipe/recipe.js';
import {RecipeUtil} from './recipe/recipe-util.js';
import {Slot} from './recipe/slot.js';
import {SlotConnection} from './recipe/slot-connection.js';
import {Handle} from './recipe/handle.js';
import {assert} from '../../platform/assert-web.js';
import {PlanningResult} from './plan/planning-result.js';
import {Loader} from './loader.js';

class RelevantContextRecipes extends Strategy {
  private _recipes: Recipe[] = [];

  constructor(context: Manifest, modality: string) {
    super();
    for (let recipe of context.allRecipes) {
      if (modality && recipe.particles.find(p => p.spec && !p.spec.matchModality(modality)) !== undefined) {
        continue;
      }

      recipe = recipe.clone();
      const options = {errors: new Map()};
      if (recipe.normalize(options)) {
        this._recipes.push(recipe);
      } else {
        console.warn(`could not normalize a context recipe: ${[...options.errors.values()].join('\n')}.\n${recipe.toString()}`);
      }
    }
  }

  async generate({generation}: {generation: number}): Promise<Descendant[]> {
    if (generation !== 0) {
      return [];
    }

    return this._recipes.map(recipe => ({
      result: recipe,
      score: 1,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
      valid: Object.isFrozen(recipe),
    }));
  }
}

// tslint:disable-next-line: variable-name
const IndexStrategies = [
  ConvertConstraintsToConnections,
  AddMissingHandles,
  ResolveRecipe,
  MatchFreeHandlesToConnections,
  // This one is not in-line with 'transparent' interfaces, but it operates on
  // recipes without looking at the context and cannot run after AddUseHandles.
  // We will revisit this list when we take a stab at recipe interfaces.
  CreateHandleGroup
];

export class RecipeIndex {
  ready;
  private _recipes: Recipe[];
  private _isReady = false;

  constructor(context: Manifest, loader: Loader, modality: string) {
    const trace = Tracing.start({cat: 'indexing', name: 'RecipeIndex::constructor', overview: true});
    const arcStub = new Arc({
      id: 'index-stub',
      context: new Manifest({id: 'empty-context'}),
      loader,
      slotComposer: modality ? new SlotComposer({modality, noRoot: true}) : null,
      recipeIndex: this,
      // TODO: Not speculative really, figure out how to mark it so DevTools doesn't pick it up.
      speculative: true
    });
    const strategizer = new Strategizer(
      [
        new RelevantContextRecipes(context, modality),
        ...IndexStrategies.map(S => new S(arcStub))
      ],
      [],
      Rulesets.Empty
    );
    this.ready = trace.endWith(new Promise(async resolve => {
      const generations = [];

      do {
        const record = await strategizer.generate();
        generations.push({record, generated: strategizer.generated});
      } while (strategizer.generated.length + strategizer.terminal.length > 0);

      if (DevtoolsConnection.isConnected) {
        StrategyExplorerAdapter.processGenerations(
            PlanningResult.formatSerializableGenerations(generations),
            DevtoolsConnection.get(), {label: 'Index', keep: true});
      }

      const population = strategizer.population;
      const candidates = new Set(population);
      for (const result of population) {
        for (const deriv of result.derivation) {
          if (deriv.parent) candidates.delete(deriv.parent);
        }
      }
      this._recipes = [...candidates].map(r => r.result);
      this._isReady = true;
      resolve(true);
    }));
  }

  get recipes(): Recipe[] {
    if (!this._isReady) throw Error('await on recipeIndex.ready before accessing');
    return this._recipes;
  }

  ensureReady(): void {
    assert(this._isReady, 'await on recipeIndex.ready before accessing');
  }

  /**
   * Given provided handle and requested fates, finds handles with
   * matching type and requested fate.
   */
  findHandleMatch(handle: Handle, requestedFates?: string[]): Handle[] {
    this.ensureReady();

    const particleNames = handle.connections.map(conn => conn.particle.name);

    const results: Handle[] = [];
    for (const recipe of this._recipes) {
      if (recipe.particles.some(particle => !particle.name)) {
        // Skip recipes where not all verbs are resolved to specific particles
        // to avoid trying to coalesce a recipe with itself.
        continue;
      }
      for (const otherHandle of recipe.handles) {
        if (requestedFates && !(requestedFates.includes(otherHandle.fate))) {
          continue;
        }

        if (!this.doesHandleMatch(handle, otherHandle)) {
          continue;
        }

        // If we're connecting the same sets of particles, that's probably not OK.
        // This is a poor workaround for connecting the exact same recipes together, to be improved.
        const otherParticleNames = otherHandle.connections.map(conn => conn.particle.name);
        const connectedParticles = new Set([...particleNames, ...otherParticleNames]);
        if (connectedParticles.size === particleNames.length
            && particleNames.length === otherParticleNames.length) continue;

        results.push(otherHandle);
      }
    }
    return results;
  }

  doesHandleMatch(handle: Handle, otherHandle: Handle): boolean {
    if (Boolean(handle.id) && Boolean(otherHandle.id) && handle.id !== otherHandle.id) {
      // Either at most one of the handles has an ID, or they are the same.
      return false;
    }
    // TODO was otherHandle.name, is localName correct
    if (otherHandle.connections.length === 0 || otherHandle.localName === 'descriptions') {
      return false;
    }

    // If we're connecting only create/use/? handles, we require communication.
    // We don't do that if at least one handle is map/copy, as in such case
    // everyone can be a reader.
    // We inspect both fate and originalFate as copy ends up as use in an
    // active recipe, and ? could end up as anything.
    const fates = [handle.originalFate, handle.fate, otherHandle.originalFate, otherHandle.fate];
    if (!fates.includes('copy') && !fates.includes('map')) {
      const counts = RecipeUtil.directionCounts(handle);
      const otherCounts = RecipeUtil.directionCounts(otherHandle);
      // Someone has to read and someone has to write.
      if (otherCounts.in + counts.in === 0 || otherCounts.out + counts.out === 0) {
        return false;
      }
    }

    // If requesting handle has tags, we should have overlap.
    if (handle.tags.length > 0 && !handle.tags.some(t => otherHandle.tags.includes(t))) {
      return false;
    }

    // If types don't match.
    if (!Handle.effectiveType(handle.mappedType, [...handle.connections, ...otherHandle.connections])) {
      return false;
    }

    return true;
  }

  /**
   * Given a slot, find consume slot connections that could be connected to it.
   */
  findConsumeSlotConnectionMatch(slot: Slot) {
    this.ensureReady();

    const consumeConns = [];
    for (const recipe of this._recipes) {
      if (recipe.particles.some(particle => !particle.name)) {
        // Skip recipes where not all verbs are resolved to specific particles
        // to avoid trying to coalesce a recipe with itself.
        continue;
      }
      for (const slotConn of recipe.slotConnections) {
        if (!slotConn.targetSlot && MapSlots.specMatch(slotConn, slot) && MapSlots.tagsOrNameMatch(slotConn, slot)) {
          const matchingHandles = [];
          if (!MapSlots.handlesMatch(slotConn, slot)) {
            // Find potential handle connections to coalesce
            slot.handleConnections.forEach(slotHandleConn => {
              const matchingConns = Object.values(slotConn.particle.connections).filter(particleConn => {
                return particleConn.direction !== 'host'
                    && (!particleConn.handle || !particleConn.handle.id || particleConn.handle.id === slotHandleConn.handle.id)
                    && Handle.effectiveType(slotHandleConn.handle.mappedType, [particleConn]);
              });
              matchingConns.forEach(matchingConn => {
                if (this._fatesAndDirectionsMatch(slotHandleConn, matchingConn)) {
                  matchingHandles.push({handle: slotHandleConn.handle, matchingConn});
                }
              });
            });

            if (matchingHandles.length === 0) {
              continue;
            }
          }
          consumeConns.push({slotConn, matchingHandles});
        }
      }
    }
    return consumeConns;
  }

  findProvidedSlot(slotConn: SlotConnection): Slot[] {
    this.ensureReady();

    const providedSlots: Slot[] = [];
    for (const recipe of this._recipes) {
      if (recipe.particles.some(particle => !particle.name)) {
        // Skip recipes where not all verbs are resolved to specific particles
        // to avoid trying to coalesce a recipe with itself.
        continue;
      }
      for (const consumeConn of recipe.slotConnections) {
        for (const providedSlot of Object.values(consumeConn.providedSlots)) {
          if (MapSlots.slotMatches(slotConn, providedSlot)) {
            providedSlots.push(providedSlot);
          }
        }
      }
    }
    return providedSlots;
  }

  /**
   * Helper function that determines whether handle connections in a provided slot
   * and a potential consuming slot connection could be match, considering their fates and directions.
   *
   * - `slotHandleConn` is a handle connection restricting the provided slot.
   * - `matchingHandleConn` - a handle connection of a particle, whose slot connection is explored
   *    as a potential match to a slot above.
   */
  private _fatesAndDirectionsMatch(slotHandleConn, matchingHandleConn): boolean {
    const matchingHandle = matchingHandleConn.handle;
    const allMatchingHandleConns = matchingHandle ? matchingHandle.connections : [matchingHandleConn];
    const matchingHandleConnsHasOutput = allMatchingHandleConns.find(conn => ['out', 'inout'].includes(conn.direction));
    switch (slotHandleConn.handle.fate) {
      case 'create':
        // matching handle not defined or its fate is 'create' or '?'.
        return !matchingHandle || ['use', '?'].includes(matchingHandle.fate);
      case 'use':
        // matching handle is not defined or its fate is either 'use' or '?'.
        return !matchingHandle || ['use', '?'].includes(matchingHandle.fate);
      case 'copy':
        // Any handle fate, except explicit 'create'.
        return !matchingHandle || matchingHandle.fate !== 'create';
      case 'map':
        // matching connections don't have output direction and matching handle's fate isn't copy.
        return !matchingHandleConnsHasOutput && (!matchingHandle || matchingHandle.fate !== 'copy');
      case '?':
        return false;
      default:
        throw new Error(`Unexpected fate ${slotHandleConn.handle.fate}`);
    }
  }

  get coalescableFates(): string[] {
    return ['create', 'use', '?'];
  }

  findCoalescableHandles(recipe: Recipe, otherRecipe: Recipe, usedHandles?: Set<Handle>): Map<Handle, Handle> {
    assert(recipe !== otherRecipe, 'Cannot coalesce handles in the same recipe');
    const otherToHandle: Map<Handle, Handle> = new Map();
    usedHandles = usedHandles || new Set();
    for (const handle of recipe.handles) {
      if(usedHandles.has(handle) || !this.coalescableFates.includes(handle.fate)) {
        continue;
      }
      for (const otherHandle of otherRecipe.handles) {
        if (usedHandles.has(otherHandle) || !this.coalescableFates.includes(otherHandle.fate)) {
          continue;
        }
        if (this.doesHandleMatch(handle, otherHandle)) {
          otherToHandle.set(handle, otherHandle);
          usedHandles.add(handle);
          usedHandles.add(otherHandle);
        }
      }
    }
    return otherToHandle;
  }
}
