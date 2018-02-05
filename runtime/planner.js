// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy, Strategizer} from '../strategizer/strategizer.js';
import assert from '../platform/assert-web.js';
import Recipe from './recipe/recipe.js';
import RecipeUtil from './recipe/recipe-util.js';
import RecipeWalker from './recipe/walker.js';
import ConvertConstraintsToConnections from './strategies/convert-constraints-to-connections.js';
import AssignRemoteViews from './strategies/assign-remote-views.js';
import CopyRemoteViews from './strategies/copy-remote-views.js';
import AssignViewsByTagAndType from './strategies/assign-views-by-tag-and-type.js';
import InitPopulation from './strategies/init-population.js';
import MapConsumedSlots from './strategies/map-consumed-slots.js';
import MapRemoteSlots from './strategies/map-remote-slots.js';
import MatchParticleByVerb from './strategies/match-particle-by-verb.js';
import NameUnnamedConnections from './strategies/name-unnamed-connections.js';
import AddUseViews from './strategies/add-use-views.js';
import CreateDescriptionHandle from './strategies/create-description-handle.js';
import Manifest from './manifest.js';
import InitSearch from './strategies/init-search.js';
import SearchTokensToParticles from './strategies/search-tokens-to-particles.js';
import FallbackFate from './strategies/fallback-fate.js';
import GroupHandleConnections from './strategies/group-handle-connections.js';
import CombinedStrategy from './strategies/combined-strategy.js';

import Speculator from './speculator.js';
import Description from './description.js';
import Tracing from '../tracelib/trace.js';

import StrategyExplorerAdapter from './debug/strategy-explorer-adapter.js';

class CreateViews extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(strategizer) {
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
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

    return {results, generate: null};
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
      new MapConsumedSlots(),
      new AssignRemoteViews(arc),
      new CopyRemoteViews(arc),
      new MapRemoteSlots(arc),
      new MatchParticleByVerb(arc),
      new NameUnnamedConnections(arc),
      new AddUseViews(),
      new CreateDescriptionHandle(),
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

  async plan(timeout, generations) {
    let trace = Tracing.async({cat: 'planning', name: 'Planner::plan', args: {timeout}});
    timeout = timeout || NaN;
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
      if (now() - start > timeout) {
        console.warn('Planner.plan timed out.');
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

  async suggest(timeout, generations) {
    if (!generations && this._arc._debugging) generations = [];
    let trace = Tracing.async({cat: 'planning', name: 'Planner::suggest', args: {timeout}});
    let plans = await trace.wait(() => this.plan(timeout, generations));
    trace.resume();
    let suggestions = [];
    let speculator = new Speculator();
    // TODO: Run some reasonable number of speculations in parallel.
    let results = [];
    for (let plan of plans) {
      let hash = ((hash) => { return hash.substring(hash.length - 4);})(await plan.digest());

      if (this._matchesActiveRecipe(plan)) {
        this._updateGeneration(generations, hash, (g) => g.active = true);
        continue;
      }

      let relevance = await trace.wait(() => speculator.speculate(this._arc, plan));
      trace.resume();
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
          if (description.toLowerCase().indexOf(arc.search) < 0) {
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
        hash
      });
    }
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
