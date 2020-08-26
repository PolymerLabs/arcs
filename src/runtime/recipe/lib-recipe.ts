/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Fate, Direction} from '../arcs-types/enums.js';
import {HandleConnectionSpec, ConsumeSlotConnectionSpec} from '../arcs-types/particle-spec.js';
import {Dictionary} from '../../utils/hot.js';
import {ClaimIsTag} from '../arcs-types/claim.js';

export interface Particle {
  name: string;
}

export interface Handle {
  id: string;
  fate: Fate;
  claims: Map<string, ClaimIsTag[]>;
}

export interface Slot {
}

export interface SlotConnection {
  particle: Particle;
  targetSlot: Slot;
  providedSlots: Dictionary<Slot>;
  getSlotSpec(): ConsumeSlotConnectionSpec;
  name: string;
}

export interface HandleConnection {
  particle: Particle;
  handle: Handle;
  spec: HandleConnectionSpec;
  name: string;
  direction: Direction;
}

export interface Recipe {
  isResolved(): boolean;
  particles: Particle[];
  handles: Handle[];
  slots: Slot[];
  handleConnections: HandleConnection[];
  slotConnections: SlotConnection[];
}
