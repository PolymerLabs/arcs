/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlannerInspector, PlannerInspectorFactory, InspectablePlanner} from '../planning/planner-inspector.js';
import {PlanningResult, SerializableGeneration} from '../planning/plan/planning-result.js';
import {DevtoolsConnection} from './devtools-connection.js';
import {DevtoolsChannel} from '../platform/devtools-channel-web.js';
import {Suggestion} from '../planning/plan/suggestion.js';
import {VisibilityOptions} from '../planning/plan/plan-consumer.js';

export const devtoolsPlannerInspectorFactory: PlannerInspectorFactory = {
  create(planner: InspectablePlanner): PlannerInspector {
    return new DevtoolsPlannerInspector(planner);
  }
};

class DevtoolsPlannerInspector implements PlannerInspector {

  private arcDevtoolsChannel: DevtoolsChannel|null = null;

  constructor(planner: InspectablePlanner) {
    void DevtoolsConnection.onceConnected.then(devtoolsChannel => {
      this.arcDevtoolsChannel = devtoolsChannel.forArc(planner.arc);
      if (planner.forceReplan) {
        this.arcDevtoolsChannel.listen('force-replan', () => void planner.forceReplan());
      }
    });
  }

  strategizingRecord(generations: SerializableGeneration[], options = {}) {
    if (!this.arcDevtoolsChannel) return;
    this.arcDevtoolsChannel.send({
      messageType: 'generations',
      messageBody: {results: generations, options}
    });
  }

  updatePlanningResults(result: PlanningResult, metadata) {
    if (!this.arcDevtoolsChannel) return;
    this.arcDevtoolsChannel.send({
      messageType: 'suggestions-changed',
      messageBody: {
        suggestions: this.formatSuggestions(result.suggestions),
        lastUpdated: result.lastUpdated.getTime(),
        metadata
      }
    });
  }

  updateVisibleSuggestions(visibleSuggestions: Suggestion[], options: VisibilityOptions) {
    if (!this.arcDevtoolsChannel) return;
    this.arcDevtoolsChannel.send({
      messageType: 'visible-suggestions-changed',
      messageBody: {
        visibleSuggestionHashes: visibleSuggestions.map(s => s.hash),
        visibilityReasons: options ? [...options.reasons.entries()].map(e => ({hash: e[0], ...e[1]})) : undefined
      }
    });
  }

  updatePlanningAttempt(suggestions: Suggestion[], metadata: {}) {
    if (!this.arcDevtoolsChannel) return;
    this.arcDevtoolsChannel.send({
      messageType: 'planning-attempt',
      messageBody: {
        suggestions: suggestions ? this.formatSuggestions(suggestions) : null,
        metadata
      }
    });
  }

  private formatSuggestions(suggestions: Suggestion[]): {}[] {
    return suggestions.map(s => {
      const suggestionCopy = {...s};
      suggestionCopy['particles'] = s.plan.particles.map(p => ({name: p.name}));
      delete suggestionCopy.plan;
      return suggestionCopy;
    });
  }
}
