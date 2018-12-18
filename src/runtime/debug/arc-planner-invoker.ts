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
import {Planner} from '../planner.js';
import {Manifest} from '../manifest.js';

export class ArcPlannerInvoker {
  arc: Arc;
  planner: Planner;
  
  constructor(arc: Arc, arcDevtoolsChannel) {
    this.arc = arc;
    this.planner = new Planner();
    this.planner.init(arc);

    arcDevtoolsChannel.listen('fetch-strategies', () => arcDevtoolsChannel.send({
      messageType: 'fetch-strategies-result',
      messageBody: this.planner.strategizer._strategies.map(a => a.constructor.name)
    }));

    arcDevtoolsChannel.listen('invoke-planner', async msg => arcDevtoolsChannel.send({
      messageType: 'invoke-planner-result',
      messageBody: await this.invokePlanner(msg.messageBody)
    }));
  }

  async invokePlanner(msg) {
    const strategy = this.planner.strategizer._strategies.find(s => s.constructor.name === msg.strategy);
    if (!strategy) return {error: 'could not find strategy'};

    let manifest;
    try {
      manifest = await Manifest.parse(msg.recipe, {loader: this.arc._loader, fileName: 'manifest.manifest'});
    } catch (error) {
      return {error: error.message};
    }

    const recipe = manifest.recipes[0];
    recipe.normalize();

    const results = await strategy.generate({
      generation: 0,
      generated: [{result: recipe, score: 1}],
      population: [{result: recipe, score: 1}],
      terminal: []
    });

    for (const result of results) {
      result.hash = await result.hash;
      result.derivation = undefined;
      const recipe = result.result;
      result.result = recipe.toString({showUnresolved: true});

      if (!Object.isFrozen(recipe)) {
        const errors = new Map();
        recipe.normalize({errors});
        result.errors = [...errors.keys()].map(thing => ({id: thing.id, error: errors.get(thing)}));
        result.normalized = recipe.toString();
      }
    }

    return {results};
  }
}
