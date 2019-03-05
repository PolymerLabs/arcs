import {Modality} from '../../build/runtime/modality.js';
import {SlotComposer} from '../../build/runtime/slot-composer.js';
import {PlanningModalityHandler} from '../../build/planning/arcs-planning.js';

export const DomSlotComposer = class extends SlotComposer {
  constructor(options) {
    super(Object.assign({
      modalityName: Modality.Name.Dom,
      modalityHandler: PlanningModalityHandler.domHandler
    }, options));
  }
};
