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
import {Modality} from './modality.js';
import {ModalityHandler} from './modality-handler.js';
import {Arc} from './arc.js';
import {SlotContext, ProvidedSlotContext, HostedSlotContext} from './slot-context.js';
import {SlotConsumer} from './slot-consumer.js';
import {Particle} from './recipe/particle.js';
import {Description} from './description.js';

export type SlotComposerOptions = {
  modalityName?: string;
  modalityHandler?: ModalityHandler;
  noRoot?: boolean;
  rootContainer?;
  rootContext?;
  containerKind?: string;
  containers?;
};

export class SlotComposer {
  private readonly _containerKind: string;
  readonly modality: Modality;
  readonly modalityHandler: ModalityHandler;
  private _consumers: SlotConsumer[] = [];
  protected _contexts: SlotContext[] = [];

  /**
   * |options| must contain:
   * - modalityName: the UI modality the slot-composer renders to (for example: dom).
   * - modalityHandler: the handler for UI modality the slot-composer renders to.
   * - rootContainer: the top level container to be used for slots.
   * and may contain:
   * - containerKind: the type of container wrapping each slot-context's container  (for example, div).
   */
  constructor(options: SlotComposerOptions) {
    assert(options.modalityHandler && options.modalityHandler.constructor === ModalityHandler,
           `Missing or invalid modality handler: ${options.modalityHandler}`);
    // TODO: Support rootContext for backward compatibility, remove when unused.
    options.rootContainer = options.rootContainer || options.rootContext || (options.containers || Object).root;
    assert((options.rootContainer !== undefined)
           !==
           (options.noRoot === true),
      'Root container is mandatory unless it is explicitly skipped');

    this._containerKind = options.containerKind;

    if (options.modalityName) {
      this.modality = Modality.create([options.modalityName]);
    }
    this.modalityHandler = options.modalityHandler;

    if (options.noRoot) {
      return;
    }

    const containerByName = options.containers
        || this.modalityHandler.slotConsumerClass.findRootContainers(options.rootContainer) || {};
    if (Object.keys(containerByName).length === 0) {
      // fallback to single 'root' slot using the rootContainer.
      containerByName['root'] = options.rootContainer;
    }

    Object.keys(containerByName).forEach(slotName => {
      this._contexts.push(ProvidedSlotContext.createContextForContainer(
        `rootslotid-${slotName}`, slotName, containerByName[slotName], [`${slotName}`]));
    });
  }

  get consumers(): SlotConsumer[] { return this._consumers; }
  get containerKind(): string { return this._containerKind; }

  getSlotConsumer(particle: Particle, slotName: string): SlotConsumer {
    return this.consumers.find(s => s.consumeConn.particle === particle && s.consumeConn.name === slotName);
  }

  findContainerByName(name: string): HTMLElement | undefined  {
    const contexts = this.findContextsByName(name);
    if (contexts.length === 0) {
      // TODO this is a no-op, but throwing here breaks tests
      console.warn(`No containers for '${name}'`);
    } else if (contexts.length === 1) {
      return contexts[0].container;
    }
    console.warn(`Ambiguous containers for '${name}'`);
    return undefined;
  }

  findContextsByName(name: string): ProvidedSlotContext[] {
    const providedSlotContexts = this._contexts.filter(ctx => ctx instanceof ProvidedSlotContext) as ProvidedSlotContext[];
    return providedSlotContexts.filter(ctx => ctx.name === name);
  }

  findContextById(slotId): SlotContext {
    return this._contexts.find(({id}) => id === slotId);
  }

  createHostedSlot(innerArc: Arc, transformationParticle: Particle, transformationSlotName: string, storeId: string): string {
    const transformationSlotConsumer = this.getSlotConsumer(transformationParticle, transformationSlotName);
    assert(transformationSlotConsumer,
        `Transformation particle ${transformationParticle.name} with consumed ${transformationSlotName} not found`);
    
    const hostedSlotId = innerArc.generateID();
    this._contexts.push(new HostedSlotContext(hostedSlotId, transformationSlotConsumer, storeId));
    return hostedSlotId;
  }

  _addSlotConsumer(slot: SlotConsumer) {
    slot.startRenderCallback = slot.arc.pec.startRender.bind(slot.arc.pec);
    slot.stopRenderCallback = slot.arc.pec.stopRender.bind(slot.arc.pec);
    this._consumers.push(slot);
  }

  initializeRecipe(arc: Arc, recipeParticles: Particle[]) {
    const newConsumers = [];
    // Create slots for each of the recipe's particles slot connections.
    recipeParticles.forEach(p => {
      Object.values(p.consumedSlotConnections).forEach(cs => {
        if (!cs.targetSlot) {
          assert(!cs.slotSpec.isRequired, `No target slot for particle's ${p.name} required consumed slot: ${cs.name}.`);
          return;
        }

        const slotConsumer = new this.modalityHandler.slotConsumerClass(arc, cs, this._containerKind);
        const providedContexts = slotConsumer.createProvidedContexts();
        this._contexts = this._contexts.concat(providedContexts);
        newConsumers.push(slotConsumer);
      });
    });

    // Set context for each of the slots.
    newConsumers.forEach(consumer => {
      this._addSlotConsumer(consumer);
      const context = this.findContextById(consumer.consumeConn.targetSlot.id);
      assert(context, `No context found for ${consumer.consumeConn.getQualifiedName()}`);
      context.addSlotConsumer(consumer);
    });
  }

  async renderSlot(particle: Particle, slotName: string, content) {
    const slotConsumer = this.getSlotConsumer(particle, slotName);
    assert(slotConsumer, `Cannot find slot (or hosted slot) ${slotName} for particle ${particle.name}`);

    const description = await Description.create(slotConsumer.arc);
    slotConsumer.slotContext.onRenderSlot(slotConsumer, content, async (eventlet) => {
      slotConsumer.arc.pec.sendEvent(particle, slotName, eventlet);
      // This code is a temporary hack implemented in #2011 which allows to route UI events from
      // multiplexer to hosted particles. Multiplexer assembles UI from multiple pieces rendered
      // by hosted particles. Hosted particles can render DOM elements with a key containing a
      // handle ID of the store, which contains the entity they render. The code below attempts
      // to find the hosted particle using the store matching the 'key' attribute on the event,
      // which has been extracted from DOM.
      // TODO: FIXIT!
      if (eventlet.data && eventlet.data.key) {
        // We fire off multiple async operations and don't wait.
        for (const ctx of slotConsumer.hostedSlotContexts) {
          if (!ctx.storeId) continue;

          for (const hostedConsumer of ctx.slotConsumers) {
            const store = hostedConsumer.arc.findStoreById(ctx.storeId);
            assert(store);
            // TODO(shans): clean this up when we have interfaces for Variable, Collection, etc
            // tslint:disable-next-line: no-any
            (store as any).get().then(value => {
              if (value && (value.id === eventlet.data.key)) {
                hostedConsumer.arc.pec.sendEvent(
                    hostedConsumer.consumeConn.particle,
                    hostedConsumer.consumeConn.name,
                    eventlet);
              }    
            });
          }
        }
      }
    }, description);
  }

  getAvailableContexts(): SlotContext[] {
    return this._contexts;
  }

  dispose() {
    this.consumers.forEach(consumer => consumer.dispose());
    this._contexts.forEach(context => {
      context.clearSlotConsumers();
      if (context instanceof ProvidedSlotContext && context.container) {
        this.modalityHandler.slotConsumerClass.clear(context.container);
      }
    });
    this._contexts = this._contexts.filter(c => !c.sourceSlotConsumer);
    this._consumers = [];
  }
}
