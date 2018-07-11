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
import {Affordance} from './affordance.js';
import {Slot} from './slot.js'; // TODO: rename to slot/slot-consumer.js
import {SlotContext} from './slot/slot-context.js';
import {HostedSlotConsumer} from './slot/hosted-slot-consumer.js';

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
    assert(this._affordance.slotRendererClass);

    this._slots = [];
    this._contexts = [];

    if (options.noRoot) {
      return;
    }

    let containerByName = this._affordance.slotRendererClass.findRootContainers(options.rootContainer) || {};
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

  getSlot(particle, slotName) {
    return this._slots.find(s => s.consumeConn.particle == particle && s.consumeConn.name == slotName);
  }

  findContainerByName(name) {
    let contexts = this._contexts.filter(context => context.name === name);
    if (contexts.length == 0) {
      assert(`No containers for '${name}'`);
    } else if (contexts.length == 1) {
      return contexts[0].container;
    } else {
      assert(`Ambiguous containers for '${name}'`);
    }
  }

  _findContextById(slotId) {
    return this._contexts.find(context => context.id == slotId);
  }

  createHostedSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName) {
    let hostedSlotId = this.arc.generateID();

    let transformationSlot = this.getSlot(transformationParticle, transformationSlotName);
    assert(transformationSlot,
           `Unexpected transformation slot particle ${transformationParticle.name}:${transformationSlotName}, hosted particle ${hostedParticleName}, slot name ${hostedSlotName}`);

    let hostedSlot = new HostedSlotConsumer(this.arc, transformationSlot, hostedParticleName, hostedSlotName, hostedSlotId);
    hostedSlot.renderCallback = this.arc.pec.innerArcRender.bind(this.arc.pec);
    this._addSlot(hostedSlot);

    let context = this._findContextById(transformationSlot.consumeConn.targetSlot.id);
    context.addSlot(hostedSlot);

    return hostedSlotId;
  }

  _addSlot(slot) {
    slot.startRenderCallback = this.arc.pec.startRender.bind(this.arc.pec);
    slot.stopRenderCallback = this.arc.pec.stopRender.bind(this.arc.pec);
    this._slots.push(slot);
  }

  initializeRecipe(recipeParticles) {
    let newSlots = [];
    // Create slots for each of the recipe's particles slot connections.
    recipeParticles.forEach(p => {
      Object.values(p.consumedSlotConnections).forEach(cs => {
        if (!cs.targetSlot) {
          assert(!cs.slotSpec.isRequired, `No target slot for particle's ${p.name} required consumed slot: ${cs.name}.`);
          return;
        }

        let slot = this._slots.find(slot => slot.hostedSlotId == cs.targetSlot.id);
        if (slot) {
          slot.consumeConn = cs;
        } else {
          slot = new Slot(this.arc, cs);
          newSlots.push(slot);

          cs.slotSpec.providedSlots.forEach(providedSpec => {
            this._contexts.push(SlotContext.createContextForSourceSlot(providedSpec, slot));
          });
        }
      });
    });

    // Set context for each of the slots.
    newSlots.forEach(s => {
      this._addSlot(s);

      let context = this._findContextById(s.consumeConn.targetSlot.id);
      assert(context, `No context found for ${s.consumeConn.prettyName}`);

      s.renderer = new this._affordance.slotRendererClass(context, s, this._containerKind);
      context.addSlot(s);
    });
  }

  async renderSlot(particle, slotName, content) {
    let slot = this.getSlot(particle, slotName);
    assert(slot, `Cannot find slot (or hosted slot) ${slotName} for particle ${particle.name}`);
    // Set the slot's new content.
    await slot.setContent(content, eventlet => {
      this.arc.pec.sendEvent(particle, slotName, eventlet);
    });
  }

  // TODO: rename method.
  getAvailableSlots() {
     return this._contexts;
  }

  dispose() {
    this._slots.forEach(slot => slot.dispose());
    this._affordance.slotRendererClass.dispose();
    this._contexts.forEach(context => {
      context.clearSlots();
      context.container && this._affordance.slotRendererClass.clear(context.container);
    });
  }
}
