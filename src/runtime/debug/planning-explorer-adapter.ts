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
import {Planificator} from '../plan/planificator.js';
import {Suggestion} from '../plan/suggestion';
import {DevtoolsConnection} from './devtools-connection.js';
import {Trigger} from '../plan/plan-producer.js';

 export class PlanningExplorerAdapter {
  static updatePlanningResults(result, metadata, devtoolsChannel) {
    if (devtoolsChannel) {
      devtoolsChannel.send({
        messageType: 'suggestions-changed',
        messageBody: {
          suggestions: PlanningExplorerAdapter._formatSuggestions(result.suggestions),
          lastUpdated: result.lastUpdated.getTime(),
          metadata
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

  static updatePlanningAttempt(suggestions: Suggestion[], metadata: {}, devtoolsChannel) {
    if (devtoolsChannel) {
      devtoolsChannel.send({
        messageType: 'planning-attempt',
        messageBody: {
          suggestions: suggestions ? PlanningExplorerAdapter._formatSuggestions(suggestions) : null,
          metadata
        }
      });
    }
  }

  private static _formatSuggestions(suggestions: Suggestion[]): {}[] {
    return suggestions.map(s => {
      const suggestionCopy = {...s};
      suggestionCopy['particles'] = s.plan.particles.map(p => ({name: p.name}));
      delete suggestionCopy.plan;
      return suggestionCopy;
    });
  }

  static subscribeToForceReplan(planificator: Planificator) {
    if (DevtoolsConnection.isConnected) {
      const devtoolsChannel = DevtoolsConnection.get().forArc(planificator.arc);
      devtoolsChannel.listen('force-replan', async () => {
        planificator.consumer.result.suggestions = [];
        await planificator.consumer.result.flush();
        await planificator.requestPlanning({metadata: {trigger: Trigger.Forced}});
        await planificator.loadSuggestions();
      });
    }
  }
}
