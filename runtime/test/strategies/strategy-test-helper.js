/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import Arc from '../../arc.js';

export default class StrategyTestHelper {
  static createTestArc(id, context, affordance) {
    return new Arc({
      id,
      context,
      slotComposer: {
        affordance,
        getAvailableSlots: (() => { return [{name: 'root', id: 'r0', tags: ['#root'], handles: [], handleConnections: [], getProvidedSlotSpec: () => { return {isSet: false}; }}]; })
      }
    });
  }
}
