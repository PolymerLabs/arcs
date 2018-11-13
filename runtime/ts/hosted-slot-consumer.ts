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
import {SlotConsumer} from './slot-consumer.js';
import {HostedSlotContext} from './hosted-slot-context.js';
import {Arc} from './arc.js';

export class HostedSlotConsumer extends SlotConsumer {
  readonly transformationSlotConsumer: SlotConsumer;
  readonly hostedParticleName: string; 
  readonly hostedSlotName: string;
  readonly hostedSlotId: string;
  readonly storeId: string;
  readonly _arc: Arc;
  renderCallback: ({}, {}, {}, {}) => void;

  constructor(transformationSlotConsumer, hostedParticleName, hostedSlotName, hostedSlotId, storeId, arc) {
    super(null, null);
    this.transformationSlotConsumer = transformationSlotConsumer;
    this.hostedParticleName = hostedParticleName;
    this.hostedSlotName = hostedSlotName, 
    this.hostedSlotId = hostedSlotId;
    // TODO: should this be a list?
    this.storeId = storeId;
    this._arc = arc;
  }

  get arc() { return this._arc; }

  get consumeConn() { return this._consumeConn; }
  set consumeConn(consumeConn) {
    assert(!this._consumeConn, 'Consume connection can be set only once');
    assert(this.hostedSlotId === consumeConn.targetSlot.id,
      `Expected target slot ${this.hostedSlotId}, but got ${consumeConn.targetSlot.id}`);
    assert(this.hostedParticleName === consumeConn.particle.name,
      `Expected particle ${this.hostedParticleName} for slot ${this.hostedSlotId}, but got ${consumeConn.particle.name}`);
    assert(this.hostedSlotName === consumeConn.name,
      `Expected slot ${this.hostedSlotName} for slot ${this.hostedSlotId}, but got ${consumeConn.name}`);
    this._consumeConn = consumeConn;
  }

  async setContent(content, handler, arc) {
    if (this.renderCallback) {
      this.renderCallback(
        this.transformationSlotConsumer.consumeConn.particle,
        this.transformationSlotConsumer.consumeConn.name,
        this.hostedSlotId,
        this.transformationSlotConsumer.formatHostedContent(this, content));
    }
    return null;
  }

  constructRenderRequest() {
    return this.transformationSlotConsumer.constructRenderRequest(this);
  }

  getInnerContainer(name) {
    const innerContainer = this.transformationSlotConsumer.getInnerContainer(name);
    if (innerContainer && this.storeId) {
      // TODO(shans): clean this up when we have interfaces for Variable, Collection, etc.
      // tslint:disable-next-line: no-any
      const subId = (this.arc.findStoreById(this.storeId) as any)._stored.id;
      return innerContainer[subId];
    }
    return innerContainer;
  }

  createProvidedContexts() {
    assert(this.consumeConn, `Cannot create provided context without consume connection for hosted slot ${this.hostedSlotId}`);
    return this.consumeConn.slotSpec.providedSlots.map(providedSpec =>
      new HostedSlotContext(this.consumeConn.providedSlots[providedSpec.name].id, providedSpec, this)
    );
  }

  updateProvidedContexts() {
    // The hosted context provided by hosted slots is updated as part of the transformation.
  }
}
