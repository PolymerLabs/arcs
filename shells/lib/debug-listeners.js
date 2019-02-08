import {defaultCoreDebugListeners} from '../../build/runtime/debug/arc-debug-handler.js';
import {defaultPlanningDebugListeners} from '../../build/planning/debug/arc-planner-invoker.js';

// Debug-channel listeners are injected, so that the runtime need not know about them.
export const debugListeners = [
  ...defaultPlanningDebugListeners, // This should change for a shell w/out planning
  ...defaultCoreDebugListeners
  ];

