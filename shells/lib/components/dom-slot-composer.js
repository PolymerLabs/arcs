/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Modality} from '../../../build/runtime/modality.js';
import {SlotComposer} from '../../../build/runtime/slot-composer.js';
import {PlanningModalityHandler} from '../../../build/planning/arcs-planning.js';

export const DomSlotComposer = class extends SlotComposer {
  constructor(options) {
    super(Object.assign({
      modalityName: Modality.Name.Dom,
      modalityHandler: PlanningModalityHandler.domHandler
    }, options));
  }
};
