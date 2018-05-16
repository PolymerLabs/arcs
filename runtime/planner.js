// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {now} from '../platform/date-web.js';
import {Strategizer} from '../strategizer/strategizer.js';
import * as Rulesets from './strategies/rulesets.js';
import {DeviceInfo} from '../platform/deviceinfo-web.js';
import {RecipeUtil} from './recipe/recipe-util.js';
import {ConvertConstraintsToConnections} from './strategies/convert-constraints-to-connections.js';
import {AssignRemoteHandles} from './strategies/assign-remote-handles.js';
import {CopyRemoteHandles} from './strategies/copy-remote-handles.js';
import {AssignHandlesByTagAndType} from './strategies/assign-handles-by-tag-and-type.js';
import {InitPopulation} from './strategies/init-population.js';
import {MapSlots} from './strategies/map-slots.js';
import {MatchParticleByVerb} from './strategies/match-particle-by-verb.js';
import {MatchRecipeByVerb} from './strategies/match-recipe-by-verb.js';
import {NameUnnamedConnections} from './strategies/name-unnamed-connections.js';
import {AddUseHandles} from './strategies/add-use-handles.js';
import {CreateDescriptionHandle} from './strategies/create-description-handle.js';
import {InitSearch} from './strategies/init-search.js';
import {SearchTokensToHandles} from './strategies/search-tokens-to-handles.js';
import {SearchTokensToParticles} from './strategies/search-tokens-to-particles.js';
import {FallbackFate} from './strategies/fallback-fate.js';
import {GroupHandleConnections} from './strategies/group-handle-connections.js';
import {MatchFreeHandlesToConnections} from './strategies/match-free-handles-to-connections.js';
import {CreateHandles} from './strategies/create-handles.js';
import {CreateHandleGroup} from './strategies/create-handle-group.js';
import {CombinedStrategy} from './strategies/combined-strategy.js';
import {CoalesceRecipes} from './strategies/coalesce-recipes.js';
import {ResolveRecipe} from './strategies/resolve-recipe.js';
import {Speculator} from './speculator.js';
import {Tracing} from '../tracelib/trace.js';
import {StrategyExplorerAdapter} from './debug/strategy-explorer-adapter.js';

export class Planner {
  // TODO: Use context.arc instead of arc
  init(arc, {strategies, ruleset} = {}) {
    this._arc = arc;
    strategies = strategies || Planner.AllStrategies.map(strategy => new strategy(arc));
    this.strategizer = new Strategizer(strategies, [], ruleset || Rulesets.Empty);
  }

  // Specify a timeout value less than zero to disable timeouts.
  async plan(timeout, generations) {
    let trace = Tracing.start({cat: 'planning', name: 'Planner::plan', overview: true, args: {timeout}});
    timeout = timeout || -1;
    let allResolved = [];
    let start = now();
    do {
      let record = await trace.wait(this.strategizer.generate());
      let generated = this.strategizer.generated;
      trace.addArgs({
        generated: generated.length,
      });
      if (generations) {
        generations.push({generated, record});
      }

      let resolved = this.strategizer.generated
          .map(individual => individual.result)
          .filter(recipe => recipe.isResolved());

      allResolved.push(...resolved);
      const elapsed = now() - start;
      if (timeout >= 0 && elapsed > timeout) {
        console.warn(`Planner.plan timed out [elapsed=${Math.floor(elapsed)}ms, timeout=${timeout}ms].`);
        break;
      }
    } while (this.strategizer.generated.length + this.strategizer.terminal.length > 0);
    trace.end();
    return allResolved;
  }

  _matchesActiveRecipe(plan) {
    let planShape = RecipeUtil.recipeToShape(plan);
    let result = RecipeUtil.find(this._arc._activeRecipe, planShape);
    return result.some(r => r.score == 0);
  }

  _speculativeThreadCount() {
    // TODO(wkorman): We'll obviously have to rework the below when we do
    // speculation in the cloud.
    const cores = DeviceInfo.hardwareConcurrency();
    const memory = DeviceInfo.deviceMemory();
    // For now, allow occupying half of the available cores while constraining
    // total memory used to at most a quarter of what's available. In the
    // absence of resource information we just run two in parallel as a
    // perhaps-low-end-device-oriented balancing act.
    const minCores = 2;
    if (!cores || !memory) {
      return minCores;
    }

    // A rough estimate of memory used per thread in gigabytes.
    const memoryPerThread = 0.125;
    const quarterMemory = memory / 4;
    const maxThreadsByMemory = quarterMemory / memoryPerThread;
    const maxThreadsByCores = cores / 2;
    return Math.max(minCores, Math.min(maxThreadsByMemory, maxThreadsByCores));
  }
  _splitToGroups(items, groupCount) {
    const groups = [];
    if (!items || items.length == 0) return groups;
    const groupItemSize = Math.max(1, Math.floor(items.length / groupCount));
    let startIndex = 0;
    for (let i = 0; i < groupCount && startIndex < items.length; i++) {
      groups.push(items.slice(startIndex, startIndex + groupItemSize));
      startIndex += groupItemSize;
    }
    // Add any remaining items to the end of the last group.
    if (startIndex < items.length) {
      groups[groups.length - 1].push(...items.slice(startIndex, items.length));
    }
    return groups;
  }
  async suggest(timeout, generations, speculator) {
    let trace = Tracing.start({cat: 'planning', name: 'Planner::suggest', overview: true, args: {timeout}});
    if (!generations && this._arc._debugging) generations = [];
    let plans = await trace.wait(this.plan(timeout, generations));
    let suggestions = [];
    speculator = speculator || new Speculator();
    // We don't actually know how many threads the VM will decide to use to
    // handle the parallel speculation, but at least we know we won't kick off
    // more than this number and so can somewhat limit resource utilization.
    // TODO(wkorman): Rework this to use a fixed size 'thread' pool for more
    // efficient work distribution.
    const threadCount = this._speculativeThreadCount();
    const planGroups = this._splitToGroups(plans, threadCount);
    let results = await trace.wait(Promise.all(planGroups.map(async (group, groupIndex) => {
      let results = [];
      for (let plan of group) {
        let hash = ((hash) => { return hash.substring(hash.length - 4);})(await plan.digest());

        if (this._matchesActiveRecipe(plan)) {
          this._updateGeneration(generations, hash, (g) => g.active = true);
          continue;
        }

        // TODO(wkorman): Look at restoring trace.wait() here, and whether we
        // should do similar for the async getRecipeSuggestion() below as well?
        let relevance = await speculator.speculate(this._arc, plan, hash);
        if (!relevance.isRelevant(plan)) {
          this._updateGeneration(generations, hash, (g) => g.irrelevant = true);
          continue;
        }
        let rank = relevance.calcRelevanceScore();

        relevance.newArc.description.relevance = relevance;
        let description = await relevance.newArc.description.getRecipeSuggestion();

        this._updateGeneration(generations, hash, (g) => g.description = description);

        // TODO: Move this logic inside speculate, so that it can stop the arc
        // before returning.
        relevance.newArc.stop();

        results.push({
          plan,
          rank,
          description: relevance.newArc.description,
          descriptionText: description, // TODO(mmandlis): exclude the text description from returned results.
          hash,
          groupIndex
        });
      }
      return results;
    })));
    results = [].concat(...results);

    if (this._arc._debugging) {
      StrategyExplorerAdapter.processGenerations(generations);
    }

    return trace.endWith(results);
  }
  _updateGeneration(generations, hash, handler) {
    if (generations) {
      generations.forEach(g => {
        g.generated.forEach(gg => {
          if (gg.hash.endsWith(hash)) {
            handler(gg);
          }
        });
      });
    }
  }
}

Planner.InitializationStrategies = [
  InitPopulation,
  InitSearch
];

Planner.ResolutionStrategies = [
  SearchTokensToParticles,
  SearchTokensToHandles,
  GroupHandleConnections,
  FallbackFate,
  CreateHandles,
  CreateHandleGroup,
  AssignHandlesByTagAndType,
  ConvertConstraintsToConnections,
  MapSlots,
  AssignRemoteHandles,
  CopyRemoteHandles,
  MatchParticleByVerb,
  MatchRecipeByVerb,
  NameUnnamedConnections,
  AddUseHandles,
  CreateDescriptionHandle,
  MatchFreeHandlesToConnections,
  ResolveRecipe,
  CoalesceRecipes
];

Planner.AllStrategies = Planner.InitializationStrategies.concat(Planner.ResolutionStrategies);
