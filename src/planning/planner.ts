/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Consumer} from '../runtime/hot.js';
import {assert} from '../platform/assert-web.js';
import {now} from '../platform/date-web.js';
import {DeviceInfo} from '../platform/deviceinfo-web.js';
import {Arc} from '../runtime/arc.js';
import {RecipeUtil} from '../runtime/recipe/recipe-util.js';
import {Tracing} from '../tracelib/trace.js';

import {PlanningResult} from './plan/planning-result.js';
import {Suggestion} from './plan/suggestion.js';
import {Speculator} from './speculator.js';
import {AddMissingHandles} from './strategies/add-missing-handles.js';
import {AssignHandles} from './strategies/assign-handles.js';
import {CoalesceRecipes} from './strategies/coalesce-recipes.js';
import {ConvertConstraintsToConnections} from './strategies/convert-constraints-to-connections.js';
import {CreateDescriptionHandle} from './strategies/create-description-handle.js';
import {CreateHandleGroup} from './strategies/create-handle-group.js';
import {FindHostedParticle} from './strategies/find-hosted-particle.js';
import {FindRequiredParticle} from './strategies/find-required-particle.js';
import {GroupHandleConnections} from './strategies/group-handle-connections.js';
import {InitPopulation} from './strategies/init-population.js';
import {InitSearch} from './strategies/init-search.js';
import {MapSlots} from './strategies/map-slots.js';
import {MatchFreeHandlesToConnections} from './strategies/match-free-handles-to-connections.js';
import {MatchParticleByVerb} from './strategies/match-particle-by-verb.js';
import {MatchRecipeByVerb} from './strategies/match-recipe-by-verb.js';
import {NameUnnamedConnections} from './strategies/name-unnamed-connections.js';
import {ResolveRecipe} from './strategies/resolve-recipe.js';
import * as Rulesets from './strategies/rulesets.js';
import {SearchTokensToHandles} from './strategies/search-tokens-to-handles.js';
import {SearchTokensToParticles} from './strategies/search-tokens-to-particles.js';
import {Strategizer, StrategyDerived, GenerationRecord, Ruleset} from './strategizer.js';
import {Descendant} from '../runtime/recipe/walker.js';
import {Recipe} from '../runtime/recipe/recipe.js';
import {Description} from '../runtime/description.js';
import {Runtime} from '../runtime/runtime.js';
import {Relevance} from '../runtime/relevance.js';
import {PlannerInspector, PlannerInspectorFactory, InspectablePlanner} from './planner-inspector.js';
import {logsFactory} from '../platform/logs-factory.js';

const {log} = logsFactory('planner', 'olive');

export interface AnnotatedDescendant extends Descendant<Recipe> {
  active?: boolean;
  irrelevant?: boolean;
  description?: string;
}

export interface Generation {
  generated: AnnotatedDescendant[];
  record: GenerationRecord;
}

const suggestionByHash = () => Runtime.getRuntime().getCacheService().getOrCreateCache<string, Suggestion>('suggestionByHash');

export interface PlannerInitOptions {
  strategies?: StrategyDerived[];
  ruleset?: Ruleset;
  strategyArgs?: {};
  speculator?: Speculator;
  inspectorFactory?: PlannerInspectorFactory;
  noSpecEx?: boolean;
}

export class Planner implements InspectablePlanner {
  public arc: Arc;
  // public for debug tools
  strategizer: Strategizer;
  speculator?: Speculator;
  inspector?: PlannerInspector;
  noSpecEx: boolean;

  // TODO: Use context.arc instead of arc
  init(arc: Arc, {strategies = Planner.AllStrategies, ruleset = Rulesets.Empty, strategyArgs = {}, speculator = undefined, inspectorFactory = undefined, noSpecEx = false}: PlannerInitOptions) {
    strategyArgs = Object.freeze({...strategyArgs});
    this.arc = arc;
    const strategyImpls = strategies.map(strategy => new strategy(arc, strategyArgs));
    this.strategizer = new Strategizer(strategyImpls, [], ruleset);
    this.speculator = speculator;
    if (inspectorFactory) {
      this.inspector = inspectorFactory.create(this);
    }
    this.noSpecEx = noSpecEx;
  }

  // Specify a timeout value less than zero to disable timeouts.
  async plan(timeout?: number, generations: Generation[] = []) {
    const trace = Tracing.start({cat: 'planning', name: 'Planner::plan', overview: true, args: {timeout}});
    timeout = timeout || -1;
    const allResolved: Recipe[] = [];
    const start = now();
    do {
      const record = await trace.wait(this.strategizer.generate());
      const generated = this.strategizer.generated;
      trace.addArgs({
        generated: generated.length,
        generation: this.strategizer.generation
      });
      if (generations) {
        generations.push({generated, record});
      }

      const resolved = this.strategizer.generated
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

    if (generations.length && this.inspector) {
      this.inspector.strategizingRecord(
          PlanningResult.formatSerializableGenerations(generations),
          {label: 'Planner', keep: true});
    }
    return allResolved;
  }

  _speculativeThreadCount(): number {
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

  _splitToGroups(items: Recipe[], groupCount: number) {
    const groups: Recipe[][] = [];
    if (!items || items.length === 0) return groups;
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

  async suggest(timeout?: number, generations: Generation[] = []) : Promise<Suggestion[]> {
    const trace = Tracing.start({cat: 'planning', name: 'Planner::suggest', overview: true, args: {timeout}});
    const plans = await trace.wait(this.plan(timeout, generations));
    // We don't actually know how many threads the VM will decide to use to
    // handle the parallel speculation, but at least we know we won't kick off
    // more than this number and so can somewhat limit resource utilization.
    // TODO(wkorman): Rework this to use a fixed size 'thread' pool for more
    // efficient work distribution.
    const threadCount = this._speculativeThreadCount();
    const planGroups = this._splitToGroups(plans, threadCount);
    const results = await trace.wait(Promise.all(planGroups.map(async (group, groupIndex) => {
      const results: Suggestion[] = [];
      for (const plan of group) {
        const hash = ((hash) => hash.substring(hash.length - 4))(await plan.digest());

        if (RecipeUtil.matchesRecipe(this.arc.activeRecipe, plan)) {
          this._updateGeneration(generations, hash, (g) => g.active = true);
          continue;
        }

        const planTrace = Tracing.start({
          cat: 'speculating',
          sequence: `speculator_${groupIndex}`,
          overview: true,
          args: {groupIndex}
        });

        const suggestion = await this.retrieveOrCreateSuggestion(hash, plan, this.arc);
        if (!suggestion) {
          this._updateGeneration(generations, hash, (g) => g.irrelevant = true);
          planTrace.end({name: '[Irrelevant suggestion]', args: {hash, groupIndex}});
          continue;
        }
        this._updateGeneration(generations, hash, g => g.description = suggestion.descriptionText);
        suggestion.groupIndex = groupIndex;
        results.push(suggestion);

        planTrace.end({name: suggestion.descriptionText, args: {rank: suggestion.rank, hash, groupIndex}});
      }
      return results;
    })));
    const suggestionResults = ([] as Suggestion[]).concat(...results);

    const logStrategyResults = false;
    if (logStrategyResults) {
      const dump = [];
      generations.forEach(gen => {
        const result = [];
        gen.generated.forEach(g => {
          if (g.result /*&& g.result.name*/) {
            const options = {
              errors: new Map(),
              showUnresolved: true
            };
            const resolved = g.result.isResolved(options);
            const data = {
              name: g.result.name || g.result.toString().slice(0, 80),
              resolved
            };
            if (!resolved) {
              data['errors'] = [...options.errors].map(([n, v]) => `${n} => ${v}`);
              data['unresolved'] = options['details'];
            }
            result.push(data);
          }
        });
        if (result.length) {
          dump.push(result);
        }
      });
      console.log(JSON.stringify(dump, null, '  '));
    }

    return trace.endWith(suggestionResults);
  }

  static clearCache() {
    suggestionByHash().clear();
  }

  private async retrieveOrCreateSuggestion(hash: string, plan: Recipe, arc: Arc) : Promise<Suggestion|undefined> {
    const cachedSuggestion = suggestionByHash().get(hash);
    if (cachedSuggestion && cachedSuggestion.isUpToDate(arc, plan)) {
      return cachedSuggestion;
    }
    let relevance: Relevance|undefined = undefined;
    let description: Description|null = null;
    if (this._shouldSpeculate(plan)) {
      //log(`speculatively executing [${plan.name}]`);
      const result = await this.speculator.speculate(this.arc, plan, hash);
      if (!result) {
        return undefined;
      }
      const speculativeArc = result.speculativeArc;
      relevance = result.relevance;
      description = await Description.create(speculativeArc, relevance);
      //log(`[${plan.name}] => [${description.getRecipeSuggestion()}]`);
    } else {
      const speculativeArc = await arc.cloneForSpeculativeExecution();
      await speculativeArc.mergeIntoActiveRecipe(plan);
      relevance = Relevance.create(arc, plan);
      description = await Description.create(speculativeArc, relevance);
    }
    const suggestion = Suggestion.create(plan, hash, relevance);
    suggestion.setDescription(
        description,
        this.arc.modality,
        // this.arc.pec.slotComposer ?
        //   this.arc.pec.slotComposer.modalityHandler.descriptionFormatter
        //   : undefined
    );
    suggestionByHash().set(hash, suggestion);
    return suggestion;
  }

  _shouldSpeculate(plan) {
    if (!this.speculator || this.noSpecEx) {
      return false;
    }

    // TODO(cypher1): Remove handling for preslandles syntax once preslandles syntax is not supported.
    if (plan.handleConnections.some(({type}) => type.toString() === `[Description {key: Text, value: Text}]`)
     || plan.handleConnections.some(({type}) => type.toString() === `[Description {Text key, Text value}]`)) {
      return true;
    }
    const planPatternsWithTokens = plan.patterns.filter(p => p.includes('${'));
    const particlesWithTokens = plan.particles.filter(p => !!p.spec.pattern && p.spec.pattern.includes('${'));
    if (planPatternsWithTokens.length === 0 && particlesWithTokens.length === 0) {
      return false;
    }
    // Check if recipe description use out handle connections.
    for (const pattern of planPatternsWithTokens) {
      const allTokens = Description.getAllTokens(pattern);
      for (const tokens of allTokens) {
        const particle = plan.particles.find(p => p.name === tokens[0]);
        assert(particle);
        const handleConn = particle.getConnectionByName(tokens[1]);
        if (handleConn && handleConn.handle && RecipeUtil.directionCounts(handleConn.handle).writes > 0) {
          return true;
        }
      }
    }
    // Check if particle descriptions use out handle connections.
    for (const particle of particlesWithTokens) {
      const allTokens = Description.getAllTokens(particle.spec.pattern);
      for (const tokens of allTokens) {
        const handleConn = particle.getConnectionByName(tokens[0]);
        if (handleConn && handleConn.handle && RecipeUtil.directionCounts(handleConn.handle).writes > 0) {
          return true;
        }
      }
    }
    return false;
  }

  _updateGeneration(generations: Generation[], hash: string, handler: Consumer<AnnotatedDescendant>) {
    if (generations) {
      generations.forEach(g => {
        g.generated.forEach(gg => {
          assert(typeof gg.hash === 'string');
          if (typeof gg.hash === 'string' && gg.hash.endsWith(hash)) {
            handler(gg);
          }
        });
      });
    }
  }

  // tslint:disable-next-line: variable-name
  static InitializationStrategies: StrategyDerived[] = [
    InitPopulation,
    InitSearch
  ];

  // tslint:disable-next-line: variable-name
  static ResolutionStrategies: StrategyDerived[] = [
    SearchTokensToParticles,
    SearchTokensToHandles,
    GroupHandleConnections,
    CreateHandleGroup,
    ConvertConstraintsToConnections,
    MapSlots,
    AssignHandles,
    MatchParticleByVerb,
    MatchRecipeByVerb,
    NameUnnamedConnections,
    AddMissingHandles,
    CreateDescriptionHandle,
    MatchFreeHandlesToConnections,
    ResolveRecipe,
    FindHostedParticle,
    CoalesceRecipes,
    FindRequiredParticle
  ];

  // tslint:disable-next-line: variable-name
  static AllStrategies: StrategyDerived[] = Planner.InitializationStrategies.concat(Planner.ResolutionStrategies);
}
