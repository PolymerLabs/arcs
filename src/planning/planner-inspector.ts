/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ArcInfo} from '../runtime/arc-info.js';
import {PlanningResult, SerializableGeneration} from './plan/planning-result.js';
import {Suggestion} from './plan/suggestion.js';
import {VisibilityOptions} from './plan/plan-consumer.js';

export interface PlannerInspectorFactory {
  create(planner: InspectablePlanner): PlannerInspector;
}

/**
 * Planner interface exposed to developer tools.
 */
export interface InspectablePlanner {
  readonly arcInfo: ArcInfo;
  forceReplan?(): Promise<void>;
}

/**
 * Interface for receiving notifications of updates from the Planner.
 */
export interface PlannerInspector {
  updatePlanningResults(result: PlanningResult, metadata): void;
  updateVisibleSuggestions(visibleSuggestions: Suggestion[], options?: VisibilityOptions): void;
  updatePlanningAttempt(suggestions: Suggestion[], metadata: {}): void;
  strategizingRecord(generations: SerializableGeneration[], options: {}): void;
}
