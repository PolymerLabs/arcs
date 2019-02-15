/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {DescriptionDomFormatter} from './description-dom-formatter.js';
import {DescriptionFormatter} from './description-formatter.js';
import {SlotDomConsumer} from './slot-dom-consumer.js';
import {MockSlotDomConsumer} from './testing/mock-slot-dom-consumer.js';

export class ModalityHandler {
  constructor(public readonly slotConsumerClass: typeof SlotDomConsumer,
              public readonly descriptionFormatter?: typeof DescriptionFormatter){}

  static createHeadlessHandler(): ModalityHandler {
    return new ModalityHandler(MockSlotDomConsumer);
  }

  static readonly domHandler : ModalityHandler = new ModalityHandler(
    SlotDomConsumer,
    DescriptionDomFormatter);
}
