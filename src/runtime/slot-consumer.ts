/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';

import {Arc} from './arc.js';
import {Description} from './description.js';
import {SlotConnection} from './recipe/slot-connection.js';
import {HostedSlotContext, ProvidedSlotContext, SlotContext} from './slot-context.js';

export class SlotConsumer {
  public readonly consumeConn?: SlotConnection;
  slotContext: SlotContext;
  readonly directlyProvidedSlotContexts: ProvidedSlotContext[] = [];
  readonly hostedSlotContexts: HostedSlotContext[] = [];
  startRenderCallback: ({}) => void;
  stopRenderCallback: ({}) => void;
  eventHandler: ({}) => void;
  readonly containerKind?: string;
  // Contains `container` and other modality specific rendering information
  // (eg for `dom`: model, template for dom renderer) by sub id. Key is `undefined` for singleton slot.
  private _renderingBySubId: Map<string|undefined, {container?: {}, model?, templateName?: string}> = new Map();
  private innerContainerBySlotId: {} = {};
  public readonly arc: Arc;
  private _description: Description;

  constructor(arc: Arc, consumeConn?: SlotConnection, containerKind?: string) {
    this.arc = arc;
    this.consumeConn = consumeConn;
    this.containerKind = containerKind;
  }

  get description() { return this._description; }
  async resetDescription() {
    this._description = await Description.create(this.arc);
  }

  getRendering(subId?) { return this._renderingBySubId.get(subId); }
  get renderings() { return [...this._renderingBySubId.entries()]; }
  addRenderingBySubId(subId: string|undefined, rendering) {
    this._renderingBySubId.set(subId, rendering);
  }

  addHostedSlotContexts(context: HostedSlotContext) {
    context.containerAvailable = Boolean(this.slotContext.containerAvailable);
    this.hostedSlotContexts.push(context);
  }

  get allProvidedSlotContexts(): ProvidedSlotContext[] {
    return [...this.generateProvidedContexts()];
  }

  findProvidedContext(predicate: (_: ProvidedSlotContext) => boolean) {
    return this.generateProvidedContexts(predicate).next().value;
  }

  private *generateProvidedContexts(predicate = (_: ProvidedSlotContext) => true): IterableIterator<ProvidedSlotContext> {
    for (const context of this.directlyProvidedSlotContexts) {
      if (predicate(context)) yield context;
    }
    for (const hostedContext of this.hostedSlotContexts) {
      for (const hostedConsumer of hostedContext.slotConsumers) {
        yield* hostedConsumer.generateProvidedContexts(predicate);
      }
    }
  }

  onContainerUpdate(newContainer, originalContainer) {
    assert(this.slotContext instanceof ProvidedSlotContext, 'Container can only be updated in non-hosted context');
    const context = this.slotContext as ProvidedSlotContext;

    if (Boolean(newContainer) !== Boolean(originalContainer)) {
      if (newContainer) {
        this.startRender();
      } else {
        this.stopRender();
      }
    }
    this.hostedSlotContexts.forEach(ctx => ctx.containerAvailable = Boolean(newContainer));

    if (newContainer !== originalContainer) {
      const contextContainerBySubId = new Map();
      if (context && context.spec.isSet) {
        Object.keys(context.container || {}).forEach(subId => contextContainerBySubId.set(subId, context.container[subId]));
      } else {
        contextContainerBySubId.set(undefined, context.container);
      }

      for (const [subId, container] of contextContainerBySubId) {
        if (!this._renderingBySubId.has(subId)) {
          this._renderingBySubId.set(subId, {});
        }
        const rendering = this.getRendering(subId);
        if (!rendering.container || !this.isSameContainer(rendering.container, container)) {
          if (rendering.container) {
            // The rendering already had a container, but it's changed. The original container needs to be cleared.
            this.clearContainer(rendering);
          }
          rendering.container = this.createNewContainer(container, subId);
        }
      }
      for (const [subId, rendering] of this.renderings) {
        if (!contextContainerBySubId.has(subId)) {
          this.deleteContainer(rendering.container);
          this._renderingBySubId.delete(subId);
        }
      }
    }
  }

  createProvidedContexts() {
    return this.consumeConn.getSlotSpec().providedSlots.map(
      spec => new ProvidedSlotContext(this.consumeConn.providedSlots[spec.name].id, spec.name, /* tags=*/ [], /* container= */ null, spec, this));
  }

  updateProvidedContexts() {
    this.allProvidedSlotContexts.forEach(providedContext => {
      providedContext.container = providedContext.sourceSlotConsumer.getInnerContainer(providedContext.id);
    });
  }

  startRender() {
    if (this.consumeConn && this.startRenderCallback) {
      this.startRenderCallback({
        particle: this.consumeConn.particle,
        slotName: this.consumeConn.name,
        providedSlots: new Map(this.allProvidedSlotContexts.map(context => ([context.name, context.id] as [string, string]))),
        contentTypes: this.constructRenderRequest()
      });
    }
  }

  stopRender() {
    if (this.consumeConn && this.stopRenderCallback) {
      this.stopRenderCallback({particle: this.consumeConn.particle, slotName: this.consumeConn.name});
    }
  }

  setContent(content, handler) {
    if (content && Object.keys(content).length > 0 && this.description) {
      content.descriptions = this.populateHandleDescriptions();
    }
    this.eventHandler = handler;
    for (const [subId, rendering] of this.renderings) {
      this.setContainerContent(rendering, this.formatContent(content, subId), subId);
    }
  }

  populateHandleDescriptions() {
    if (!this.consumeConn) return null;
    const descriptions = {};
    Object.values(this.consumeConn.particle.connections).map(handleConn => {
      if (handleConn.handle) {
        descriptions[`${handleConn.name}.description`] =
            this.description.getHandleDescription(handleConn.handle).toString();
      }
    });
    return descriptions;
  }

  getInnerContainer(slotId) {
    return this.innerContainerBySlotId[slotId];
  }

  _initInnerSlotContainer(slotId, subId, container) {
    if (subId) {
      if (!this.innerContainerBySlotId[slotId]) {
        this.innerContainerBySlotId[slotId] = {};
      }
      assert(!this.innerContainerBySlotId[slotId][subId], `Multiple ${slotId}:${subId} inner slots cannot be provided`);
      this.innerContainerBySlotId[slotId][subId] = container;
    } else {
      this.innerContainerBySlotId[slotId] = container;
    }
  }
  _clearInnerSlotContainers(subIds) {
    subIds.forEach(subId => {
      if (subId) {
        Object.values(this.innerContainerBySlotId).forEach(inner => delete inner[subId]);
      } else {
        this.innerContainerBySlotId = {};
      }
    });
  }

  isSameContainer(container, contextContainer) {
    return (!container && !contextContainer) || (container === contextContainer);
  }

  // abstract
  constructRenderRequest(): string[] { return []; }
  dispose() {}
  createNewContainer(contextContainer, subId): {} { return null; }
  deleteContainer(container) {}
  clearContainer(rendering) {}
  setContainerContent(rendering, content, subId) {}
  formatContent(content, subId): object { return null; }
  formatHostedContent(content): {} { return null; }
  static clear(container) {}
}
