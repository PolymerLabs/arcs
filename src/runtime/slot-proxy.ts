/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Particle} from './particle';
import {PECInnerPort} from './api-channel';
import {Content} from './slot-consumer.js';

/**
 * A representation of a consumed slot. Retrieved from a particle using
 * particle.getSlot(name)
 */
export class SlotProxy {
  readonly slotName: string;
  readonly providedSlots: ReadonlyMap<string, string>;
  private particle: Particle;
  private readonly apiPort: PECInnerPort;
  // eslint-disable-next-line func-call-spacing
  private readonly handlers = new Map<string, ((event: {}) => void)[]>();
  readonly requestedContentTypes = new Set<string>();
  private _isRendered = false;

  constructor(apiPort: PECInnerPort, particle: Particle, slotName: string, providedSlots: ReadonlyMap<string, string>) {
    this.apiPort = apiPort;
    this.slotName = slotName;
    this.particle = particle;
    this.providedSlots = providedSlots;
  }

  get isRendered() {
    return this._isRendered;
  }

  /**
   * renders content to the slot.
   */
  render(content: Content): void {
    this.apiPort.Render(this.particle, this.slotName, content);

    Object.keys(content).forEach(key => { this.requestedContentTypes.delete(key); });
    // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
    this._isRendered = this.requestedContentTypes.size === 0 && (Object.keys(content).length > 0);
  }

  /**
   * registers a callback to be invoked when 'name' event happens.
   */
  registerEventHandler(name: string, f): void {
    if (!this.handlers.has(name)) {
      this.handlers.set(name, []);
    }
    this.handlers.get(name).push(f);
  }

  clearEventHandlers(name: string): void {
    this.handlers.set(name, []);
  }

  fireEvent(event): void {
    for (const handler of this.handlers.get(event.handler) || []) {
      handler(event);
    }
  }

  /**
   * Called by PEC to remove all rendering capabilities to this slotProxy from the current 
   * particle and give them to the given particle. 
   */
  rewire(particle: Particle): void {
    this.particle.removeSlotProxy(this.slotName);
    
    this.particle = particle;
    this._isRendered = false;
    this.particle.addSlotProxy(this);
    this.particle.renderSlot(this.slotName, ['model', 'template', 'templateName']);
  }
}
