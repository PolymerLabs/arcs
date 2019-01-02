/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';
import {SlotDomConsumer} from './slot-dom-consumer.js';
import {SuggestDomConsumer} from './suggest-dom-consumer.js';
import {MockSlotDomConsumer} from './testing/mock-slot-dom-consumer.js';
import {MockSuggestDomConsumer} from './testing/mock-suggest-dom-consumer.js';
import {DescriptionFormatter} from './description.js';
import {DescriptionDomFormatter} from './description-dom-formatter.js';

export class ModalityHandler {
  constructor(public readonly slotConsumerClass: typeof SlotDomConsumer,
              public readonly suggestionConsumerClass: typeof SuggestDomConsumer,
              public readonly descriptionFormatter?: typeof DescriptionFormatter) {}

  static createHeadlessHandler(): ModalityHandler {
    return new ModalityHandler(MockSlotDomConsumer, MockSuggestDomConsumer);
  }

  static readonly domHandler = new ModalityHandler(
    SlotDomConsumer,
    SuggestDomConsumer,
    DescriptionDomFormatter);
}
