import {Modality} from '../../build/runtime/modality.js';
import {PlanningModalityHandler} from '../../build/runtime/planning-modality-handler.js';
import {SlotComposer} from '../../build/runtime/slot-composer.js';

const domModality = {
  modalityName: Modality.Name.Dom,
  modalityHandler: PlanningModalityHandler.domHandler
};

export const DomSlotComposer = class extends SlotComposer {
  constructor(options) {
    super(options ? Object.assign(options, domModality) : domModality);
  }
};
