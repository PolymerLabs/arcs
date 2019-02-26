/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class StrategyExplorerAdapter {
  static processGenerations(generations, devtoolsChannel, options = {}) {
    if (devtoolsChannel) {
      devtoolsChannel.send({
        messageType: 'generations',
        messageBody: {results: generations, options},
      });
    }
  }

  // This is a helper method that logs all possible derivations of stratetegies that contributed
  // to generating the resolved recipes.
  static printGenerations(generations) {
    for (let i = 0; i < generations.length; ++i) {
      for (let j = 0; j < generations[i].generated.length; ++j) {
        const gg = generations[i].generated[j];
        if (!gg.result.isResolved()) {
          continue;
        }
        const results = StrategyExplorerAdapter._collectDerivation(gg.derivation, []);
        console.log(results.map(r => `gen [${i}][${j}] ${r.reverse().join(' -> ')}`).join('\n'));
      }
    }
  }

  static _collectDerivation(derivation, allResults) {
    for (const d of derivation) {
      const results = [];
      results.push(d.strategy.constructor.name);

      if (d.parent) {
        const innerResults = StrategyExplorerAdapter._collectDerivation(d.parent.derivation, []);
        for (const ir of innerResults) {
          allResults.push([].concat(results, ir));
        }
      } else {
        allResults.push(results);
      }
    }
    return allResults;
  }
}
