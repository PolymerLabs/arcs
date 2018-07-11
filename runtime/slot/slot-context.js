/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {ProvidedSlotSpec} from '../particle-spec.js';

// Holds container (eg div element) and its additional info.
// Must be initialized either with a container (for root slots provided by the shell) or
// tuple of sourceSlot (runtime/slot.js) and spec (ProvidedSlotSpec) of the slot.
export class SlotContext {
  constructor(id, name, tags, container, spec, sourceSlot) {
    assert(Boolean(container) != Boolean(spec), `Exactly one of either container or slotSpec may be set`);
    assert(Boolean(spec) == Boolean(spec), `Spec and source slot can only be set together`);

    // Readonly identifiers
    this._id = id;
    this._name = name;
    this._tags = tags || [];

    this._container = container; // eg div element.

    // The context's accompanying ProvidedSlotSpec (see particle-spec.js).
    // Initialized to a default spec, if the container is one of the shell provided top root-contexts.
    this._spec = spec || new ProvidedSlotSpec(name);
    // The slot (ie runtime/slot.js) providing this container (eg div)
    this._sourceSlot = sourceSlot;
    if (this.sourceSlot) {
      this.sourceSlot._providedSlotContexts.push(this);
    }
    // The slots (runtime/slot.js) rendered into this context.
    this._slots = [];
  }
  get id() { return this._id; }
  get name() { return this._name; }
  get tags() { return this._tags; }
  get spec() { return this._spec; }
  get container() { return this._container; }
  get sourceSlot() { return this._sourceSlot; }
  get slots() { return this._slots; }

  static createContextForContainer(id, name, container, tags) {
    return new SlotContext(id, name, tags, container);
  }

  static createContextForSourceSlot(spec, sourceSlot, tags) {
    return new SlotContext(sourceSlot.consumeConn.providedSlots[spec.name].id, spec.name, tags, null, spec, sourceSlot);
  }

  isSameContainer(container) {
    if (this.spec.isSet) {
      if (Boolean(this.container) != Boolean(container)) {
        return false;
      }
      if (!this.container) {
        return true;
      }
      return Object.keys(this.container).length == Object.keys(container).length &&
             Object.values(this.container).every(
                currentContainer => Object.values(container).find(newContainer => newContainer == currentContainer));
    }
    return this.container == container;
  }

  set container(container) {
    if (this.isSameContainer(container)) {
      return;
    }
    let originalContainer = this.container;
    this._container = container;

    this.slots.forEach(slot => slot.onContainerUpdate(this.container, originalContainer));
  }

  addSlot(slot) {
    this._slots.push(slot);

    if (this.container) {
      slot.onContainerUpdate(this.container, null);
    }
  }

  clearSlots() {
    this._slots = [];
  }

  // This method is for backward compabitility with SlotComposer::getAvailableSlots
  // TODO(mmandlis): Get rid of it, when possible.
  get handleConnections() {
    if (this.spec) {
      return this.spec.handles.map(handle => this.sourceSlot.consumeConn.particle.connections[handle]);
    }
  }
}

