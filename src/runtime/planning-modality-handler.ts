/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {SlotDomConsumer} from './slot-dom-consumer.js';
import {SuggestDomConsumer} from './suggest-dom-consumer.js';
import {MockSlotDomConsumer} from './testing/mock-slot-dom-consumer.js';
import {MockSuggestDomConsumer} from './testing/mock-suggest-dom-consumer.js';
import {ModalityHandler} from './modality-handler.js';
import {DescriptionFormatter} from './description-formatter.js';
import {DescriptionDomFormatter} from './description-dom-formatter.js';


export class PlanningModalityHandler extends ModalityHandler{
  constructor(slotConsumerClass: typeof SlotDomConsumer,
              public readonly suggestionConsumerClass: typeof SuggestDomConsumer,
              descriptionFormatter?: typeof DescriptionFormatter){
    super(slotConsumerClass, descriptionFormatter);
  }

  static createHeadlessHandler(): PlanningModalityHandler {
    return new PlanningModalityHandler(MockSlotDomConsumer, MockSuggestDomConsumer);
  }

  static readonly domHandler : PlanningModalityHandler = new PlanningModalityHandler(
    SlotDomConsumer,
    SuggestDomConsumer,
    DescriptionDomFormatter);
}
