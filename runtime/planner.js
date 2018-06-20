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
import {DevtoolsConnection} from './debug/devtools-connection.js';

export class Planner {
  constructor() {
    this._relevances = [];
  }

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

  async suggest(timeout, generations, speculator) {
    let trace = Tracing.start({cat: 'planning', name: 'Planner::suggest', overview: true, args: {timeout}});
    if (!generations && DevtoolsConnection.isConnected) generations = [];
    let plans = await trace.wait(this.plan(timeout, generations));
    let suggestions = [];
    speculator = speculator || new Speculator();
    let results = [];
    await trace.wait(Promise.all(plans.map(async (plan, planIndex) => {
      let hash = ((hash) => { return hash.substring(hash.length - 4);})(await plan.digest());

      if (this._matchesActiveRecipe(plan)) {
        this._updateGeneration(generations, hash, (g) => g.active = true);
        return;
      }

      // TODO(wkorman): Look at restoring trace.wait() here, and whether we
      // should do similar for the async getRecipeSuggestion() below as well?
      let relevance = await speculator.speculate(this._arc, plan, hash);
      this._relevances.push(relevance);
      if (!relevance.isRelevant(plan)) {
        this._updateGeneration(generations, hash, (g) => g.irrelevant = true);
        return;
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
        planIndex
      });
    })));

    this._relevances = [];

    if (generations && DevtoolsConnection.isConnected) {
      StrategyExplorerAdapter.processGenerations(generations, DevtoolsConnection.get());
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
  dispose() {
    // The speculative arc particle execution contexts are are worklets,
    // so they need to be cleanly shut down, otherwise they would persist,
    // as an idle eventLoop in a process waiting for messages.
    this._relevances.forEach(relevance => relevance.newArc.dispose());
    this._relevances = [];
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
