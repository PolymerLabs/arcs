/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {SlotContext} from './ts-build/slot-context.js';

export class HostedSlotContext extends SlotContext {
  // This is a context of a hosted slot, can only contain a hosted slot.
  constructor(id, providedSpec, hostedSlotConsumer) {
    super(id, providedSpec.name, providedSpec.tags, /* container= */ null, providedSpec, hostedSlotConsumer);
    if (this.sourceSlotConsumer.storeId) {
      this.handles = [{id: this.sourceSlotConsumer.storeId}];
    }
  }
  get container() {
    return this.sourceSlotConsumer.getInnerContainer(this.name) || null;
  }
}
