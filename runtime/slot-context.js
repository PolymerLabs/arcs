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
import {ProvidedSlotSpec} from './particle-spec.js';

// Holds container (eg div element) and its additional info.
// Must be initialized either with a container (for root slots provided by the shell) or
// tuple of sourceSlotConsumer and spec (ProvidedSlotSpec) of the slot.
export class SlotContext {
  constructor(id, name, tags, container, spec, sourceSlotConsumer) {
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
    // The slot consumer providing this container (eg div)
    this._sourceSlotConsumer = sourceSlotConsumer; // SlotConsumer
    if (this.sourceSlotConsumer) {
      this.sourceSlotConsumer._providedSlotContexts.push(this);
    }
    // The slots consumers rendered into this context.
    this._slotConsumers = []; // SlotConsumer[]
  }
  get id() { return this._id; }
  get name() { return this._name; }
  get tags() { return this._tags; }
  get spec() { return this._spec; }
  get container() { return this._container; }
  get sourceSlotConsumer() { return this._sourceSlotConsumer; }
  get slotConsumers() { return this._slotConsumers; }

  static createContextForContainer(id, name, container, tags) {
    return new SlotContext(id, name, tags, container);
  }

  static createContextForSourceSlotConsumer(spec, sourceSlotConsumer, tags) {
    return new SlotContext(
        sourceSlotConsumer.consumeConn.providedSlots[spec.name].id,
        spec.name,
        tags,
        null, // container
        spec,
        sourceSlotConsumer);
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

    this.slotConsumers.forEach(slotConsumer => slotConsumer.onContainerUpdate(this.container, originalContainer));
  }

  addSlotConsumer(slotConsumer) {
    this._slotConsumers.push(slotConsumer);
    slotConsumer.slotContext = this;

    if (this.container) {
      slotConsumer.onContainerUpdate(this.container, null);
    }
  }

  clearSlotConsumers() {
    this._slotConsumers.forEach(slotConsumer => slotConsumer.slotContext = null);
    this._slotConsumers = [];
  }

  // This method is for backward compabitility with SlotComposer::getAvailableContexts
  // TODO(mmandlis): Get rid of it, when possible.
  get handleConnections() {
    if (this.spec) {
      return this.spec.handles.map(handle => this.sourceSlotConsumer.consumeConn.particle.connections[handle]);
    }
  }
}

