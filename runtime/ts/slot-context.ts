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
import {SlotConsumer} from '../slot-consumer.js';
import {Handle} from '../recipe/handle.js';

// Holds container (eg div element) and its additional info.
// Must be initialized either with a container (for root slots provided by the shell) or
// tuple of sourceSlotConsumer and spec (ProvidedSlotSpec) of the slot.
export class SlotContext {
  readonly id: string;
  readonly name: string;
  readonly tags: string[] = [];
  private _container: HTMLElement; // eg div element.
  spec: ProvidedSlotSpec;
  readonly sourceSlotConsumer: SlotConsumer;
  // The slots consumers rendered into this context.
  slotConsumers: SlotConsumer[] = [];
  handles: Handle[];

  constructor(id: string, name: string, tags: string[], container: HTMLElement, spec: ProvidedSlotSpec, sourceSlotConsumer: SlotConsumer = null) {
    assert(Boolean(container) !== Boolean(spec), `Exactly one of either container or slotSpec may be set`);
    assert(Boolean(spec) === Boolean(spec), `Spec and source slot can only be set together`);

    this.id = id;
    this.name = name;
    this.tags = tags || [];

    this._container = container;

    // The context's accompanying ProvidedSlotSpec (see particle-spec.js).
    // Initialized to a default spec, if the container is one of the shell provided top root-contexts.
    this.spec = spec || new ProvidedSlotSpec(name);

    // The slot consumer providing this container (eg div)
    this.sourceSlotConsumer = sourceSlotConsumer;
    if (this.sourceSlotConsumer) {
      this.sourceSlotConsumer._providedSlotContexts.push(this);
    }
    // The list of handles this context is restricted to.
    this.handles = this.spec && this.sourceSlotConsumer
      ? this.spec.handles.map(handle => this.sourceSlotConsumer.consumeConn.particle.connections[handle].handle).filter(a => a !== undefined)
      : [];

  }

  get container() { return this._container; }

  static createContextForContainer(id, name, container, tags) {
    return new SlotContext(id, name, tags, container, null);
  }

  isSameContainer(container) : boolean {
    if (this.spec.isSet) {
      if (Boolean(this.container) !== Boolean(container)) {
        return false;
      }
      if (!this.container) {
        return true;
      }
      return Object.keys(this.container).length === Object.keys(container).length &&
             Object.keys(this.container).every(key => Object.keys(container).some(newKey => newKey === key)) &&
             Object.values(this.container).every(
                currentContainer => Object.values(container).some(newContainer => newContainer === currentContainer));
    }
    return this.container === container;
  }

  set container(container) {
    if (this.isSameContainer(container)) {
      return;
    }
    const originalContainer = this.container;
    this._container = container;

    this.slotConsumers.forEach(slotConsumer => slotConsumer.onContainerUpdate(this.container, originalContainer));
  }

  addSlotConsumer(slotConsumer) {
    this.slotConsumers.push(slotConsumer);
    slotConsumer.slotContext = this;

    if (this.container) {
      slotConsumer.onContainerUpdate(this.container, null);
    }
  }

  clearSlotConsumers() {
    this.slotConsumers.forEach(slotConsumer => slotConsumer.slotContext = null);
    this.slotConsumers = [];
  }
}
