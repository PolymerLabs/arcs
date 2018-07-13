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
import {SlotConsumer} from './slot-consumer.js';

export class HostedSlotConsumer extends SlotConsumer {
  constructor(transformationSlotConsumer, hostedParticleName, hostedSlotName, hostedSlotId) {
    super();
    this._transformationSlotConsumer = transformationSlotConsumer;
    this._hostedParticleName = hostedParticleName;
    this._hostedSlotName = hostedSlotName, 
    this._hostedSlotId = hostedSlotId;
  }

  get transformationSlotConsumer() { return this._transformationSlotConsumer; }
  get hostedParticleName() { return this._hostedParticleName; }
  get hostedSlotName() { return this._hostedSlotName; }
  get hostedSlotId() { return this._hostedSlotId; }

  get consumeConn() { return this._consumeConn; }
  set consumeConn(consumeConn) {
    assert(this.hostedSlotId == consumeConn.targetSlot.id,
      `Expected target slot ${this.hostedSlotId}, but got ${consumeConn.targetSlot.id}`);
    assert(this.hostedParticleName == consumeConn.particle.name,
      `Expected particle ${this.hostedParticleName} for slot ${this.hostedSlotId}, but got ${consumeConn.particle.name}`);
    assert(this.hostedSlotName == consumeConn.name,
      `Expected slot ${this.hostedSlotName} for slot ${this.hostedSlotId}, but got ${consumeConn.name}`);
    this._consumeConn = consumeConn;

    if (this.transformationSlotConsumer.slotContext.container) {
      this.startRender();
    }
  }

  setContent(content) {
    this.renderCallback && this.renderCallback(
        this.transformationSlotConsumer.consumeConn.particle,
        this.transformationSlotConsumer.consumeConn.name,
        this.hostedSlotId,
        this.transformationSlotConsumer.formatHostedContent(this, content));
  }

  constructRenderRequest() {
    return this.transformationSlotConsumer.constructRenderRequest(this);
  }
}
