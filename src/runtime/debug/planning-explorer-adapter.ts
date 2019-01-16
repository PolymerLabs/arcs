/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 import {PlanningResult} from '../plan/planning-result.js';

 export class PlanningExplorerAdapter {
  static updatePlanningResults(result, devtoolsChannel) {
    if (devtoolsChannel) {
      const suggestions = result.suggestions.map(s => {
        const suggestionCopy = {...s};
        suggestionCopy.particles = s.plan.particles.map(p => ({name: p.name}));
        delete suggestionCopy.plan;
        return suggestionCopy;
      });
      devtoolsChannel.send({
        messageType: 'suggestions-changed',
        messageBody: {
          suggestions,
          lastUpdated: result.lastUpdated.getTime()
        }
      });
    }
  }
  static updateVisibleSuggestions(visibleSuggestions, devtoolsChannel) {
    if (devtoolsChannel) {
      devtoolsChannel.send({
        messageType: 'visible-suggestions-changed',
        messageBody: {
          visibleSuggestionHashes: visibleSuggestions.map(s => s.hash)
        }
      });
    }
  }
}
