/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../runtime/arc.js';
import {Predicate} from '../runtime/hot.js';
import {ArcDevtoolsChannel, DevtoolsMessage} from './abstract-devtools-channel.js';
import {Manifest} from '../runtime/manifest.js';
import {Recipe} from '../runtime/recipe/recipe.js';
import {Descendant} from '../runtime/recipe/walker.js';
import {Planner} from '../planning/planner.js';
import {RecipeIndex} from '../planning/recipe-index.js';
import {CoalesceRecipes} from '../planning/strategies/coalesce-recipes.js';
import * as Rulesets from '../planning/strategies/rulesets.js';
import {Strategizer, Strategy, StrategyDerived} from '../planning/strategizer.js';

class InitialRecipe extends Strategy {
  private recipe: Recipe;

  constructor(recipe: Recipe) {
    super();
    this.recipe = recipe;
  }

  async generate({generation}: {generation: number}): Promise<Descendant<Recipe>[]> {
    if (generation !== 0) {
      return [];
    }

    return [{
      result: this.recipe,
      score: 1,
      derivation: [{strategy: this, parent: undefined}],
      hash: this.recipe.digest(),
      valid: Object.isFrozen(this.recipe),
    }];
  }
}

export class ArcPlannerInvoker {
  private arc: Arc;
  private recipeIndex: RecipeIndex;
  
  constructor(arc: Arc, arcDevtoolsChannel: ArcDevtoolsChannel) {
    this.arc = arc;

    arcDevtoolsChannel.listen('fetch-strategies', () => arcDevtoolsChannel.send({
      messageType: 'fetch-strategies-result',
      messageBody: Planner.AllStrategies.map(s => s.name)
    }));

    arcDevtoolsChannel.listen('invoke-planner', async (msg: DevtoolsMessage) => arcDevtoolsChannel.send({
      messageType: 'invoke-planner-result',
      messageBody: await this.invokePlanner(msg.messageBody.manifest, msg.messageBody.method),
      requestId: msg.requestId
    }));
  }

  private async invokePlanner(manifestString: string, method: string) {
    if (!this.recipeIndex) {
      this.recipeIndex = RecipeIndex.create(this.arc);
      await this.recipeIndex.ready;
    }

    let manifest: Manifest;
    try {
      manifest = await Manifest.parse(manifestString, {loader: this.arc._loader, fileName: 'manifest.manifest'});
    } catch (error) {
      return this.processManifestError(error);
    }

    if (manifest.recipes.length === 0) return {results: []};
    if (manifest.recipes.length > 1) return {error: {message: `More than 1 recipe present, found ${manifest.recipes.length}.`}};

    const recipe = manifest.recipes[0];
    recipe.normalize();

    if (method === 'arc' || method === 'arc_coalesce') {
      return this.multiStrategyRun(recipe, method);
    } else {
      return this.singleStrategyRun(recipe, method);
    }
  }

  async multiStrategyRun(recipe: Recipe, method: string) {
    const strategies = method === 'arc_coalesce' ? Planner.ResolutionStrategies
        : Planner.ResolutionStrategies.filter(s => s !== CoalesceRecipes);

    const strategizer = new Strategizer([new InitialRecipe(recipe), ...strategies.map(S => this.instantiate(S))], [], Rulesets.Empty);

    const terminal: Descendant<Recipe>[] = [];
    do {
      await strategizer.generate();
      terminal.push(...strategizer.terminal);
    } while (strategizer.generated.length + strategizer.terminal.length > 0);

    return this.processStrategyOutput(terminal);
  }

  async singleStrategyRun(recipe: Recipe, strategyName: string) {
    const strategy = Planner.AllStrategies.find(s => s.name === strategyName);

    if (!strategy) return {error: {message: `Strategy ${strategyName} not found`}};

    return this.processStrategyOutput(await this.instantiate(strategy).generate({
      generation: 0,
      generated: [{result: recipe, score: 1}],
      population: [{result: recipe, score: 1}],
      terminal: [{result: recipe, score: 1}]
    }));
  }

  instantiate(strategyClass: StrategyDerived): Strategy {
    // TODO: Strategies should have access to the context that is a combination of arc context and
    //       the entered manifest. Right now strategies only see arc context, which means that
    //       various strategies will not see particles defined in the manifest entered in the
    //       editor. This may bite us with verb substitution, hosted particle resolution etc.
    return new strategyClass(this.arc, {recipeIndex: this.recipeIndex});
  }

  processStrategyOutput(inputs: Descendant<Recipe>[]) {
    return {results: inputs.map(result => {
      const recipe = result.result;

      const errors = new Map();
      if (!Object.isFrozen(recipe)) {
        recipe.normalize({errors});
      }

      let recipeString = '';
      try {
        recipeString = recipe.toString({showUnresolved: true});
      } catch (e) {
        console.warn(e);
      }

      return {
        recipe: recipeString,
        derivation: this.extractDerivation(result),
        errors: [...errors.values()].map(error => ({error})),
      };
    })};
  }

  extractDerivation(result: Descendant<Recipe>): string[] {
    const found: string[] = [];
    for (const deriv of result.derivation || []) {
      if (!deriv.parent && deriv.strategy.constructor !== InitialRecipe) { 
        found.push(deriv.strategy.constructor.name);
      } else if (deriv.parent) {
        const childDerivs = this.extractDerivation(deriv.parent);
      
        for (const childDeriv of childDerivs) {
          found.push(childDeriv
              ? `${childDeriv} -> ${deriv.strategy.constructor.name}`
              : deriv.strategy.constructor.name);
        }

        if (childDerivs.length === 0) found.push(deriv.strategy.constructor.name);
      }
    }
    return found;
  }

  processManifestError(error) {
    let suggestion = null;

    const errorTypes = [{
      // TODO: Switch to declaring errors in a structured way in the error object, instead of message parsing.
      pattern: /could not find particle ([A-Z][A-Za-z0-9_]*)\n/,
      predicate: extracted => manifest => !!(manifest.particles.find(p => p.name === extracted))
    }, {
      pattern: /Could not resolve type reference to type name '([A-Z][A-Za-z0-9_]*)'\n/,
      predicate: extracted => manifest => !!(manifest.schemas[extracted])      
    }];

    for (const {pattern, predicate} of errorTypes) {
      const match = pattern.exec(error.message);
      if (match) {
        const [_, extracted] = match;
        const fileNames = this.findManifestNames(this.arc.context, predicate(extracted));
        if (fileNames.length > 0) suggestion = {action: 'import', fileNames};
      }
    }

    return {suggestion, error: ((({location, message}) => ({location, message}))(error))};
  }

  findManifestNames(manifest: Manifest, predicate: Predicate<Manifest>): string[] {
    const map: Map<string, number> = new Map();
    this.findManifestNamesRecursive(manifest, predicate, map);
    return [...map.entries()].sort(([a, depthA], [b, depthB]) => (depthA - depthB)).map(v => v[0]);
  }

  findManifestNamesRecursive(manifest: Manifest, predicate: Predicate<Manifest>, fileNames: Map<string, number>): number {
    let depth = predicate(manifest) ? 0 : Number.MAX_SAFE_INTEGER;
    for (const child of manifest.imports) {
      depth = Math.min(depth, this.findManifestNamesRecursive(child, predicate, fileNames) + 1);
    }
    // http check to avoid listing shell created 'in-memory manifest'.
    if (depth < Number.MAX_SAFE_INTEGER && manifest.fileName.startsWith('http')) {
      fileNames.set(manifest.fileName, depth);
    }
    return depth;
  }
}
