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
    assert(this._affordance.slotClass);

    let containerByName = this._affordance.slotClass.findRootContainers(options.rootContainer) || {};
    if (Object.keys(containerByName).length == 0 && options.rootContainer) {
      // fallback to single 'root' slot using the rootContainer.
      containerByName['root'] = options.rootContainer;
    }

    // TODO: refactor and rename _contextSlots: regular slots hold a context, that holds a container.
    // These are pseudo slots and hold the container directly. Should instead mimic the regular slots.
    this._contextSlots = [];
    Object.keys(containerByName).forEach(slotName => {
      this._contextSlots.push({
        id: `rootslotid-${slotName}`,
        name: slotName,
        tags: [`${slotName}`],
        container: containerByName[slotName],
        handleConnections: [],
        handles: 0,
        getProvidedSlotSpec: () => { return {isSet: false}; }});
    });

    this._slots = [];
  }

  get affordance() { return this._affordance.name; }

  getSlot(particle, slotName) {
    return this._slots.find(s => s.consumeConn.particle == particle && s.consumeConn.name == slotName);
  }

  _findContainer(slotId) {
    let contextSlot = this._contextSlots.find(slot => slot.id == slotId);
    if (contextSlot) {
      return contextSlot.container;
    }
  }

  createHostedSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName) {
    let hostedSlotId = this.arc.generateID();

    let transformationSlot = this.getSlot(transformationParticle, transformationSlotName);
    assert(transformationSlot,
           `Unexpected transformation slot particle ${transformationParticle.name}:${transformationSlotName}, hosted particle ${hostedParticleName}, slot name ${hostedSlotName}`);
    transformationSlot.addHostedSlot(hostedSlotId, hostedParticleName, hostedSlotName);
    return hostedSlotId;
  }
  _findSlotByHostedSlotId(hostedSlotId) {
    for (let slot of this._slots) {
      let hostedSlot = slot.getHostedSlot(hostedSlotId);
      if (hostedSlot) {
        return slot;
      }
    }
  }
  findHostedSlot(hostedParticle, hostedSlotName) {
    for (let slot of this._slots) {
      let hostedSlot = slot.findHostedSlot(hostedParticle, hostedSlotName);
      if (hostedSlot) {
        return hostedSlot;
      }
    }
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

        if (this._initHostedSlot(cs.targetSlot.id, p)) {
          // Skip slot creation for hosted slots.
          return;
        }

        let slot = new this._affordance.slotClass(cs, this.arc, this._containerKind);
        slot.startRenderCallback = this.arc.pec.startRender.bind(this.arc.pec);
        slot.stopRenderCallback = this.arc.pec.stopRender.bind(this.arc.pec);
        slot.innerSlotsUpdateCallback = this.updateInnerSlots.bind(this);
        newSlots.push(slot);
      });
    });

    // Attempt to set context for each of the slots.
    newSlots.forEach(s => {
      assert(!s.getContext(), `Unexpected context in new slot`);

      let container = null;
      let sourceConnection = s.consumeConn.targetSlot && s.consumeConn.targetSlot.sourceConnection;
      if (sourceConnection) {
        let sourceConnSlot = this.getSlot(sourceConnection.particle, sourceConnection.name);
        if (sourceConnSlot) {
          container = sourceConnSlot.getInnerContainer(s.consumeConn.name);
        }
      } else { // External slots provided at SlotComposer ctor (eg 'root')
        container = this._findContainer(s.consumeConn.targetSlot.id);
      }

      this._slots.push(s);

      if (container) {
        s.updateContainer(container);
      }
    });
  }

  _initHostedSlot(hostedSlotId, hostedParticle) {
    let transformationSlot = this._findSlotByHostedSlotId(hostedSlotId);
    if (!transformationSlot) {
      return false;
    }
    transformationSlot.initHostedSlot(hostedSlotId, hostedParticle);
    return true;
  }

  async renderSlot(particle, slotName, content) {
    let slot = this.getSlot(particle, slotName);
    if (slot) {
      // Set the slot's new content.
      await slot.setContent(content, eventlet => {
        this.arc.pec.sendEvent(particle, slotName, eventlet);
      });
      return;
    }

    if (this._renderHostedSlot(particle, slotName, content)) {
      return;
    }

    assert(slot, `Cannot find slot (or hosted slot) ${slotName} for particle ${particle.name}`);
  }

  _renderHostedSlot(particle, slotName, content) {
    let hostedSlot = this.findHostedSlot(particle, slotName);
    if (!hostedSlot) {
      return false;
    }
    let transformationSlot = this._findSlotByHostedSlotId(hostedSlot.slotId);
    assert(transformationSlot, `No transformation slot found for ${hostedSlot.slotId}`);

    this.arc.pec.innerArcRender(transformationSlot.consumeConn.particle, transformationSlot.consumeConn.name, hostedSlot.slotId,
      transformationSlot.formatHostedContent(hostedSlot, content));

    return true;
  }

  updateInnerSlots(slot) {
    assert(slot, 'Cannot update inner slots of null');
    // Update provided slot contexts.
    Object.keys(slot.consumeConn.providedSlots).forEach(providedSlotName => {
      let providedContainer = slot.getInnerContainer(providedSlotName);
      let providedSlot = slot.consumeConn.providedSlots[providedSlotName];
      providedSlot.consumeConnections.forEach(cc => {
        // This will trigger 'start' or 'stop' render, if applicable.
        let innerSlot = this.getSlot(cc.particle, cc.name);
        // Note: slot may not exist yet, if providing particle's context was updated after arc's
        // active recipe was updated, but before slot-composer initialized the new recipe.
        if (innerSlot) {
          innerSlot.updateContainer(providedContainer);
        }
      });
    });
  }

  getAvailableSlots() {
    let availableSlots = this.arc.activeRecipe.slots.slice();

    this._contextSlots.forEach(contextSlot => {
      if (!availableSlots.find(s => s.id == contextSlot.id)) {
        availableSlots.push(contextSlot);
      }
    });
    return availableSlots;
  }

  dispose() {
    this._slots.forEach(slot => slot.dispose());
    this._slots.forEach(slot => slot.setContainer(null));
    this._affordance.contextClass.dispose();
    this._contextSlots.forEach(contextSlot => this._affordance.contextClass.clear(contextSlot.container));
  }
}
