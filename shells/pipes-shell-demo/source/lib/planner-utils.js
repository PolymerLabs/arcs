/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Planificator} from '../../../../build/planning/plan/planificator.js';
import {devtoolsPlannerInspectorFactory} from '../../../../build/devtools-connector/devtools-planner-inspector.js';

export const createPlanificator = async arc => {
  const options = {
    userid: 'user',
    storageKeyBase: 'volatile',
    onlyConsumer: false,
    debug: true,
    inspectorFactory: devtoolsPlannerInspectorFactory,
    noSpecEx: true
  };
  const planificator = await Planificator.create(arc, options);
  return planificator;
};