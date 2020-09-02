/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary} from '../utils/lib-utils.js';

export type RenderPacket = {
  content?
  modality?: string
  containerSlotName?: string
  containerSlotId?: string
  slotMap?: Dictionary<string>
  particle?: {
    name: string
    id: string
  }
  outputSlotId?: string
};

export class AbstractSlotObserver {
  observe(packet: RenderPacket) {}
  dispatch() {}
  dispose() {}
}
