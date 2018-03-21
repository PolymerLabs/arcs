// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy, Strategizer} from '../strategizer/strategizer.js';
import assert from '../platform/assert-web.js';
import DeviceInfo from '../platform/deviceinfo-web.js';
import Recipe from './recipe/recipe.js';
import RecipeUtil from './recipe/recipe-util.js';
import RecipeWalker from './recipe/walker.js';
import ConvertConstraintsToConnections from './strategies/convert-constraints-to-connections.js';
import AssignRemoteViews from './strategies/assign-remote-views.js';
import CopyRemoteViews from './strategies/copy-remote-views.js';
import AssignViewsByTagAndType from './strategies/assign-views-by-tag-and-type.js';
import InitPopulation from './strategies/init-population.js';
import MapSlots from './strategies/map-slots.js';
import MatchParticleByVerb from './strategies/match-particle-by-verb.js';
import MatchRecipeByVerb from './strategies/match-recipe-by-verb.js';
import NameUnnamedConnections from './strategies/name-unnamed-connections.js';
import AddUseViews from './strategies/add-use-views.js';
import CreateDescriptionHandle from './strategies/create-description-handle.js';
import Manifest from './manifest.js';
import InitSearch from './strategies/init-search.js';
import SearchTokensToParticles from './strategies/search-tokens-to-particles.js';
import FallbackFate from './strategies/fallback-fate.js';
import GroupHandleConnections from './strategies/group-handle-connections.js';
import CombinedStrategy from './strategies/combined-strategy.js';
import MatchFreeHandlesToConnections from './strategies/match-free-handles-to-connections.js';
import ResolveRecipe from './strategies/resolve-recipe.js';

import Speculator from './speculator.js';
import Description from './description.js';
import Tracing from '../tracelib/trace.js';

import StrategyExplorerAdapter from './debug/strategy-explorer-adapter.js';

class CreateViews extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), new class extends RecipeWalker {
      onView(recipe, view) {
        let counts = RecipeUtil.directionCounts(view);

        let score = 1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.unknown > 0)
            return;
          if (counts.in == 0)
            score = -1;
          else
            score = 0;
        }

        if (!view.id && view.fate == '?') {
          return (recipe, view) => {view.fate = 'create'; return score;};
        }
      }
    }(RecipeWalker.Permuted), this);
  }
}


class Planner {
  // TODO: Use context.arc instead of arc
  init(arc) {
    this._arc = arc;
    let strategies = [
      new InitPopulation(arc),
      new InitSearch(arc),
      new CombinedStrategy([
        new SearchTokensToParticles(arc),
        new GroupHandleConnections(),
      ]),
      new FallbackFate(),
      new CreateViews(),
      new AssignViewsByTagAndType(arc),
      new ConvertConstraintsToConnections(arc),
      new MapSlots(arc),
      new AssignRemoteViews(arc),
      new CopyRemoteViews(arc),
      new MatchParticleByVerb(arc),
      new MatchRecipeByVerb(arc),
      new NameUnnamedConnections(arc),
      new AddUseViews(),
      new CreateDescriptionHandle(),
      new MatchFreeHandlesToConnections(),
      new ResolveRecipe(arc)
    ];
    this.strategizer = new Strategizer(strategies, [], {
      maxPopulation: 100,
      generationSize: 100,
      discardSize: 20,
    });
  }

  async generate() {
    let log = await this.strategizer.generate();
    return this.strategizer.generated;
  }

  // Specify a timeout value less than zero to disable timeouts.
  async plan(timeout, generations) {
    let trace = Tracing.async({cat: 'planning', name: 'Planner::plan', args: {timeout}});
    timeout = timeout || -1;
    let allResolved = [];
    let now = () => (typeof performance == 'object') ? performance.now() : process.hrtime();
    let start = now();
    do {
      let generated = await trace.wait(() => this.generate());
      trace.resume({args: {
        generated: this.strategizer.generated.length,
      }});
      if (generations) {
        generations.push(generated);
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
    } while (this.strategizer.generated.length > 0);
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
  async suggest(timeout, generations) {
    if (!generations && this._arc._debugging) generations = [];
    let trace = Tracing.async({cat: 'planning', name: 'Planner::suggest', args: {timeout}});
    let plans = await trace.wait(() => this.plan(timeout, generations));
    trace.resume();
    let suggestions = [];
    let speculator = new Speculator();
    // We don't actually know how many threads the VM will decide to use to
    // handle the parallel speculation, but at least we know we won't kick off
    // more than this number and so can somewhat limit resource utilization.
    // TODO(wkorman): Rework this to use a fixed size 'thread' pool for more
    // efficient work distribution.
    const threadCount = this._speculativeThreadCount();
    const planGroups = this._splitToGroups(plans, threadCount);
    let results = await trace.wait(() => Promise.all(planGroups.map(async (group, groupIndex) => {
      let results = [];
      for (let plan of group) {
        let hash = ((hash) => { return hash.substring(hash.length - 4);})(await plan.digest());

        if (this._matchesActiveRecipe(plan)) {
          this._updateGeneration(generations, hash, (g) => g.active = true);
          continue;
        }

        // TODO(wkorman): Look at restoring trace.wait() here, and whether we
        // should do similar for the async getRecipeSuggestion() below as well?
        let relevance = await speculator.speculate(this._arc, plan);
        if (!relevance.isRelevant(plan)) {
          continue;
        }
        let rank = relevance.calcRelevanceScore();

        relevance.newArc.description.relevance = relevance;
        let description = await relevance.newArc.description.getRecipeSuggestion();

        this._updateGeneration(generations, hash, (g) => g.description = description);

        // TODO: Move this logic inside speculate, so that it can stop the arc
        // before returning.
        relevance.newArc.stop();

        // Filter plans based on arc._search string.
        if (this._arc.search) {
          if (!plan.search) {
            // This plan wasn't constructed based on the provided search terms.
            if (description.toLowerCase().indexOf(this._arc.search) < 0) {
              // Description must contain the full search string.
              // TODO: this could be a strategy, if description was already available during strategies execution.
              continue;
            }
          } else {
            // This mean the plan was constructed based on provided search terms,
            // and at least one of them were resolved (in order for the plan to be resolved).
          }
        }

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
    trace.resume();
    results = [].concat(...results);
    trace.end();

    if (this._arc._debugging) {
      StrategyExplorerAdapter.processGenerations(generations);
    }

    return results;
  }
  _updateGeneration(generations, hash, handler) {
    if (generations) {
      generations.forEach(g => {
        g.forEach(gg => {
          if (gg.hash.endsWith(hash)) {
            handler(gg);
          }
        });
      });
    }
  }
}

export default Planner;
