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
import {Affordance} from './ts-build/affordance.js';
import {SlotContext} from './ts-build/slot-context.js';
import {HostedSlotConsumer} from './ts-build/hosted-slot-consumer.js';

export class SlotComposer {
  /**
   * |options| must contain:
   * - affordance: the UI affordance the slots composer render to (for example: dom).
   * - rootContainer: the top level container to be used for slots.
   * and may contain:
   * - containerKind: the type of container wrapping each slot-context's container  (for example, div).
   */
  constructor(options) {
    assert(options.affordance, 'Affordance is mandatory');
    // TODO: Support rootContext for backward compatibility, remove when unused.
    options.rootContainer = options.rootContainer || options.rootContext;
    assert(options.rootContainer !== undefined ^ options.noRoot === true,
      'Root container is mandatory unless it is explicitly skipped');

    this._containerKind = options.containerKind;
    this._affordance = Affordance.forName(options.affordance);
    assert(this._affordance.slotConsumerClass);

    this._consumers = [];
    this._contexts = [];

    if (options.noRoot) {
      return;
    }

    const containerByName = this._affordance.slotConsumerClass.findRootContainers(options.rootContainer) || {};
    if (Object.keys(containerByName).length == 0) {
      // fallback to single 'root' slot using the rootContainer.
      containerByName['root'] = options.rootContainer;
    }

    Object.keys(containerByName).forEach(slotName => {
      this._contexts.push(SlotContext.createContextForContainer(
        `rootslotid-${slotName}`, slotName, containerByName[slotName], [`${slotName}`]));
    });
  }

  get affordance() { return this._affordance.name; }
  get consumers() { return this._consumers; }

  getSlotConsumer(particle, slotName) {
    return this.consumers.find(s => s.consumeConn.particle == particle && s.consumeConn.name == slotName);
  }

  findContainerByName(name) {
    const contexts = this._contexts.filter(context => context.name === name);
    if (contexts.length == 0) {
      assert(`No containers for '${name}'`);
    } else if (contexts.length == 1) {
      return contexts[0].container;
    } else {
      assert(`Ambiguous containers for '${name}'`);
    }
  }

  findContextById(slotId) {
    return this._contexts.find(({id}) => id == slotId);
  }

  createHostedSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, storeId) {
    const hostedSlotId = this.arc.generateID();

    const transformationSlotConsumer = this.getSlotConsumer(transformationParticle, transformationSlotName);
    assert(transformationSlotConsumer,
           `Unexpected transformation slot particle ${transformationParticle.name}:${transformationSlotName}, hosted particle ${hostedParticleName}, slot name ${hostedSlotName}`);

    const hostedSlotConsumer = new HostedSlotConsumer(transformationSlotConsumer, hostedParticleName, hostedSlotName, hostedSlotId, storeId, this.arc);
    hostedSlotConsumer.renderCallback = this.arc.pec.innerArcRender.bind(this.arc.pec);
    this._addSlotConsumer(hostedSlotConsumer);

    const context = this.findContextById(transformationSlotConsumer.consumeConn.targetSlot.id);
    context.addSlotConsumer(hostedSlotConsumer);

    return hostedSlotId;
  }

  _addSlotConsumer(slot) {
    slot.startRenderCallback = this.arc.pec.startRender.bind(this.arc.pec);
    slot.stopRenderCallback = this.arc.pec.stopRender.bind(this.arc.pec);
    this._consumers.push(slot);
  }

  initializeRecipe(recipeParticles) {
    const newConsumers = [];
    // Create slots for each of the recipe's particles slot connections.
    recipeParticles.forEach(p => {
      Object.values(p.consumedSlotConnections).forEach(cs => {
        if (!cs.targetSlot) {
          assert(!cs.slotSpec.isRequired, `No target slot for particle's ${p.name} required consumed slot: ${cs.name}.`);
          return;
        }

        let slotConsumer = this.consumers.find(slot => slot.hostedSlotId == cs.targetSlot.id);
        if (slotConsumer) {
          assert(!slotConsumer.consumeConn);
          slotConsumer.consumeConn = cs;
        } else {
          slotConsumer = new this._affordance.slotConsumerClass(cs, this._containerKind);
          newConsumers.push(slotConsumer);
        }

        this._contexts = this._contexts.concat(slotConsumer.createProvidedContexts());
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

  async renderSlot(particle, slotName, content) {
    const slotConsumer = this.getSlotConsumer(particle, slotName);
    assert(slotConsumer, `Cannot find slot (or hosted slot) ${slotName} for particle ${particle.name}`);

    await slotConsumer.setContent(content, async (eventlet) => {
      this.arc.pec.sendEvent(particle, slotName, eventlet);
      if (eventlet.data && eventlet.data.key) {
        const hostedConsumers = this.consumers.filter(c => c.transformationSlotConsumer == slotConsumer);
        for (const hostedConsumer of hostedConsumers) {
          if (hostedConsumer.storeId) {
            const store = this.arc.findStoreById(hostedConsumer.storeId);
            assert(store);
            const value = await store.get();
            if (value && (value.id == eventlet.data.key)) {
              this.arc.pec.sendEvent(
                  hostedConsumer.consumeConn.particle,
                  hostedConsumer.consumeConn.name,
                  eventlet);
            }
          }
        }
      }
    }, this.arc);
  }

  getAvailableContexts() {
    return this._contexts;
  }

  dispose() {
    this.consumers.forEach(consumer => consumer.dispose());
    this._affordance.slotConsumerClass.dispose();
    this._contexts.forEach(context => {
      context.clearSlotConsumers();
      context.container && this._affordance.slotConsumerClass.clear(context.container);
    });
    this._contexts = this._contexts.filter(c => !c.sourceSlotConsumer);
    this._consumers = [];
  }
}
