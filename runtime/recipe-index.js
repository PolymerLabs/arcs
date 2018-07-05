/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Loader} from './loader.js';
import {Manifest} from './manifest.js';
import {Arc} from './arc.js';
import {SlotComposer} from './slot-composer.js';
import {Strategizer, Strategy} from '../strategizer/strategizer.js';
import {StrategyExplorerAdapter} from './debug/strategy-explorer-adapter.js';
import {Tracing} from '../tracelib/trace.js';
import {ConvertConstraintsToConnections} from './strategies/convert-constraints-to-connections.js';
import {ResolveRecipe} from './strategies/resolve-recipe.js';
import {CreateHandleGroup} from './strategies/create-handle-group.js';
import {AddUseHandles} from './strategies/add-use-handles.js';
import * as Rulesets from './strategies/rulesets.js';
import {MapSlots} from './strategies/map-slots.js';
import {DevtoolsConnection} from './debug/devtools-connection.js';
import {RecipeUtil} from './recipe/recipe-util.js';
import {Handle} from './recipe/handle.js';
import {assert} from '../platform/assert-web.js';

class RelevantContextRecipes extends Strategy {
  constructor(context, affordance) {
    super();
    this._recipes = [];
    for (let recipe of context.recipes) {
      if (affordance && recipe.particles.find(p => p.spec && !p.spec.matchAffordance(affordance)) !== undefined) {
        continue;
      }

      recipe = recipe.clone();
      let options = {errors: new Map()};
      if (recipe.normalize(options)) {
        this._recipes.push(recipe);
      } else {
        console.warn(`could not normalize a context recipe: ${[...options.errors.values()].join('\n')}.\n${recipe.toString()}`);
      }
    }
  }

  async generate({generation}) {
    if (generation != 0) {
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

const IndexStrategies = [
  ConvertConstraintsToConnections,
  AddUseHandles,
  ResolveRecipe,
  // This one is not in-line with 'transparent' interfaces, but it operates on
  // recipes without looking at the context and cannot run after AddUseHandles.
  // We will revisit this list when we take a stab at recipe interfaces.
  CreateHandleGroup
];

export class RecipeIndex {
  constructor(context, affordance) {
    let trace = Tracing.start({cat: 'indexing', name: 'RecipeIndex::constructor', overview: true});
    let arcStub = new Arc({
      id: 'index-stub',
      context: new Manifest({id: 'empty-context'}),
      slotComposer: affordance ? new SlotComposer({affordance, noRoot: true}) : null,
      recipeIndex: {},
      // TODO: Not speculative really, figure out how to mark it so DevTools doesn't pick it up.
      speculative: true
    });
    let strategizer = new Strategizer(
      [
        new RelevantContextRecipes(context, affordance),
        ...IndexStrategies.map(S => new S(arcStub))
      ],
      [],
      Rulesets.Empty
    );
    this.ready = trace.endWith(new Promise(async resolve => {
      let generations = [];

      do {
        let record = await strategizer.generate();
        generations.push({record, generated: strategizer.generated});
      } while (strategizer.generated.length + strategizer.terminal.length > 0);

      if (DevtoolsConnection.isConnected) {
        StrategyExplorerAdapter.processGenerations(
            generations, DevtoolsConnection.get(), {label: 'Index', keep: true});
      }

      let population = strategizer.population;
      let candidates = new Set(population);
      for (let result of population) {
        for (let deriv of result.derivation) {
          if (deriv.parent) candidates.delete(deriv.parent);
        }
      }
      this._recipes = [...candidates].map(r => r.result);
      this._isReady = true;
      resolve(true);
    }));
  }

  get recipes() {
    if (!this._isReady) throw Error('await on recipeIndex.ready before accessing');
    return this._recipes;
  }

  ensureReady() {
    assert(this._isReady, 'await on recipeIndex.ready before accessing');
  }

  // Given provided handle and requested fates, finds handles with
  // matching type and requested fate.
  findHandleMatch(handle, requestedFates) {
    this.ensureReady();

    let counts = RecipeUtil.directionCounts(handle);
    let particleNames = handle.connections.map(conn => conn.particle.name);

    let results = [];
    for (let recipe of this._recipes) {
      for (let otherHandle of recipe.handles) {
        if (!requestedFates.includes(otherHandle.fate)
            || otherHandle.connections.length === 0
            || otherHandle.name === 'descriptions') continue;
        let otherCounts = RecipeUtil.directionCounts(otherHandle);
        let otherParticleNames = otherHandle.connections.map(conn => conn.particle.name);

        if (otherCounts.in + counts.in === 0 // Someone has to read.
            || otherCounts.out + counts.out === 0 // Someone has to write.
            // If we're connecting the same sets of particles, that's probably not OK.
            // This is a poor workaround for connecting the exact same recipes together :(
            || new Set([...particleNames, ...otherParticleNames]).size
                === particleNames.length
            || !Handle.effectiveType(handle._mappedType,
                [...handle.connections, ...otherHandle.connections])) continue;

        results.push(otherHandle);
      }
    }
    return results;
  }

  // Given a slot, find consume slot connections that could be connected to it.
  findConsumeSlotConnectionMatch(slot) {
    this.ensureReady();

    let consumeConns = [];
    for (let recipe of this._recipes) {
      for (let slotConn of recipe.slotConnections) {
        if (!slotConn.targetSlot && MapSlots.specMatch(slotConn, slot) && MapSlots.tagsOrNameMatch(slotConn, slot)) {
          let matchingHandles = [];
          if (!MapSlots.handlesMatch(slotConn, slot)) {
            // Find potential handle connections to coalesce
            slot.handleConnections.forEach(slotHandleConn => {
              let matchingConns = Object.values(slotConn.particle.connections).filter(particleConn => {
                return (!particleConn.handle || !particleConn.handle.id || particleConn.handle.id == slotHandleConn.handle.id) &&
                       Handle.effectiveType(slotHandleConn.handle._mappedType, [particleConn]);
              });
              matchingConns.forEach(matchingConn => {
                if (this._fatesAndDirectionsMatch(slotHandleConn, matchingConn)) {
                  matchingHandles.push({handle: slotHandleConn.handle, matchingConn});
                }
              });
            });

            if (matchingHandles.length == 0) {
              continue;
            }
          }
          consumeConns.push({slotConn, matchingHandles});
        }
      }
    }
    return consumeConns;
  }

  // Helper function that determines whether handle connections in a provided slot
  // and a potential consuming slot connection could be match, considering their fates and directions.
  // `slotHandleConn` is a handle connection restricting the provided slot.
  // `matchingHandleConn` - a handle connection of a particle, whose slot connection is explored
  // as a potential match to a slot above.
  _fatesAndDirectionsMatch(slotHandleConn, matchingHandleConn) {
    let matchingHandle = matchingHandleConn.handle;
    let allMatchingHandleConns = matchingHandle ? matchingHandle.connections : [matchingHandleConn];
    let matchingHandleConnsHasOutput = allMatchingHandleConns.find(conn => ['out', 'inout'].includes(conn.direction));
    switch (slotHandleConn.handle.fate) {
      case 'create':
        // matching handle not defined or its fate is 'create' or '?'.
        return !matchingHandle || ['use', '?'].includes(matchingHandle.fate);
      case 'use':
        // matching handle is not defined or its fate is either 'use' or '?'.
        return !matchingHandle || ['use', '?'].includes(matchingHandle.fate);
      case 'copy':
        // Any handle fate, except explicit 'create'.
        return !matchingHandle || matchingHandle.fate != 'create';
      case 'map':
        // matching connections don't have output direction and matching handle's fate isn't copy.
        return !matchingHandleConnsHasOutput && (!matchingHandle || matchingHandle.fate != 'copy');
      case '?':
        assert(false, `Unexpected '?' fate in terminal recipe`);
        break;
      default:
        assert(false, `Unexpected fate ${slotHandleConn.handle.fate}`);
    }
  }
}
