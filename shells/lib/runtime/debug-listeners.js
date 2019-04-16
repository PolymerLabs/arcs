/*
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {defaultCoreDebugListeners} from '../../../build/runtime/debug/arc-debug-handler.js';
import {defaultPlanningDebugListeners} from '../../../build/planning/arcs-planning.js';

// Debug-channel listeners are injected, so that the runtime need not know about them.
export const debugListeners = [
  ...defaultPlanningDebugListeners, // This should change for a shell w/out planning
  ...defaultCoreDebugListeners
  ];

