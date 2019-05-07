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
import {Particle} from './recipe/particle.js';
import {SlotConnection} from './recipe/slot-connection.js';
import {HostedSlotContext, ProvidedSlotContext, SlotContext} from './slot-context.js';
import {StartRenderOptions, StopRenderOptions} from './particle-execution-host.js';

export interface Content {
  templateName?: string | Map<string, string>;
  // tslint:disable-next-line: no-any
  model?: {models: any, hash: string};
  descriptions?: Map<string, Description>;
  template?: string | Map<string, string>;
}

export interface Rendering {
  // The 'parent' or owning object in the UI.
  // TODO(jopra): At some point we should write an interface for this.
  // tslint:disable-next-line: no-any
  container?: any;
  // The data to be used in templating.
  // tslint:disable-next-line: no-any
  model?: any;
  // Specifies a particular template from the set of templates available to the
  // slot.
  templateName?: string;
}

export class SlotConsumer {
  public readonly consumeConn?: SlotConnection;
  slotContext: SlotContext;
  readonly directlyProvidedSlotContexts: ProvidedSlotContext[] = [];
  readonly hostedSlotContexts: HostedSlotContext[] = [];
  startRenderCallback: (options: StartRenderOptions) => void;
  stopRenderCallback: (options: StopRenderOptions) => void;
  eventHandler: ({}) => void;
  readonly containerKind?: string;
  // Contains `container` and other modality specific rendering information
  // (eg for `dom`: model, template for dom renderer) by sub id. Key is `undefined` for singleton slot.
  private readonly _renderingBySubId: Map<string|undefined, Rendering> = new Map();
  private innerContainerBySlotId: {} = {};
  public readonly arc: Arc;
  public description: Description;

  constructor(arc: Arc, consumeConn?: SlotConnection, containerKind?: string) {
    this.arc = arc;
    this.consumeConn = consumeConn;
    this.containerKind = containerKind;
  }

  getRendering(subId?: string): Rendering {
    return this._renderingBySubId.get(subId);
  }

  get renderings(): [string, Rendering][] {
    return [...this._renderingBySubId.entries()];
  }

  addRenderingBySubId(subId: string|undefined, rendering: Rendering) {
    this._renderingBySubId.set(subId, rendering);
  }

  addHostedSlotContexts(context: HostedSlotContext): void {
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

  onContainerUpdate(newContainer, originalContainer): void {
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

  createProvidedContexts(): SlotContext | ConcatArray<SlotContext> {
    return this.consumeConn.getSlotSpec().provideSlotConnections.map(
      spec => new ProvidedSlotContext(this.consumeConn.providedSlots[spec.name].id, spec.name, /* tags=*/ [], /* container= */ null, spec, this));
  }

  updateProvidedContexts(): void {
    this.allProvidedSlotContexts.forEach(providedContext => {
      providedContext.container = providedContext.sourceSlotConsumer.getInnerContainer(providedContext.id);
    });
  }

  startRender(): void {
    if (this.consumeConn && this.startRenderCallback) {
      const providedSlots = new Map(this.allProvidedSlotContexts.map(context => ([context.name, context.id] as [string, string])));

      this.startRenderCallback({
        particle: this.consumeConn.particle,
        slotName: this.consumeConn.name,
        providedSlots,
        contentTypes: this.constructRenderRequest()
      });
    }
  }

  stopRender(): void {
    if (this.consumeConn && this.stopRenderCallback) {
      this.stopRenderCallback({particle: this.consumeConn.particle, slotName: this.consumeConn.name});
    }
  }

  setContent(content: Content, handler): void {
    if (content && Object.keys(content).length > 0 && this.description) {
      content.descriptions = this._populateHandleDescriptions();
    }
    this.eventHandler = handler;
    for (const [subId, rendering] of this.renderings) {
      this.setContainerContent(rendering, this.formatContent(content, subId), subId);
    }
  }

  private _populateHandleDescriptions(): Map<string, Description> {
    if (!this.consumeConn) return null; // TODO: remove null ability
    const descriptions: Map<string, Description> = new Map();
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

  _initInnerSlotContainer(slotId, subId, container): void {
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

  protected _clearInnerSlotContainers(subIds): void {
    subIds.forEach(subId => {
      if (subId) {
        Object.values(this.innerContainerBySlotId).forEach(inner => delete inner[subId]);
      } else {
        this.innerContainerBySlotId = {};
      }
    });
  }

  isSameContainer(container, contextContainer): boolean {
    return (!container && !contextContainer) || (container === contextContainer);
  }

  // abstract
  constructRenderRequest(): string[] { return []; }
  dispose(): void {}
  createNewContainer(contextContainer, subId): {} { return null; }
  deleteContainer(container): void {}
  clearContainer(rendering): void {}
  setContainerContent(rendering, content: Content, subId): void {}
  formatContent(content: Content, subId): Content { return null; }
  formatHostedContent(content: Content): {} { return null; }
  static clear(container): void {}
  static findRootContainers(topContainer) { return {}; }
}
