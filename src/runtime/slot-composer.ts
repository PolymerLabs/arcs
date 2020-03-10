/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from './arc.js';
import {Modality} from './modality.js';
import {Particle} from './recipe/particle.js';
import {ProvideSlotConnectionSpec} from './particle-spec.js';
import {logsFactory} from '../platform/logs-factory.js';

const {log, warn} = logsFactory('SlotComposer', 'brown');

export type SlotComposerOptions = {
  modalityName?: string;
  noRoot?: boolean;
};

export class SlotComposer {
  readonly modality: Modality;
  protected _contexts = [];
  arc?;

  /**
   * |options| must contain:
   * - modalityName: the UI modality the slot-composer renders to (for example: dom).
   * - modalityHandler: the handler for UI modality the slot-composer renders to.
   * - rootContainer: the top level container to be used for slots.
   * and may contain:
   * - containerKind: the type of container wrapping each slot-context's container  (for example, div).
   */
  constructor(options?: SlotComposerOptions) {
    const opts = {
      containers: {'root': 'root-context'},
      ...options
    };

    // See SlotUtils::findAllSlotCandidates
    Object.keys(opts.containers).forEach(slotName => {
      const context = this.createContextForContainer(slotName);
      this._contexts.push(context);
    });
  }

  createContextForContainer(name) {
    return {
      id: `rootslotid-${name}`,
      name,
      tags: [`${name}`],
      spec: new ProvideSlotConnectionSpec({name}),
      handles: []
    };
  }

  getAvailableContexts() {
    return this._contexts.concat(this.arc.activeRecipe.slots);
  }

  createHostedSlot(innerArc: Arc, particle: Particle, slotName: string, storeId: string): string {
    // TODO(sjmiles): rationalize snatching off the zero-th entry
    const connection = particle.getSlandleConnections()[0];
    // TODO(sjmiles): this slot-id is created dynamically and was not available to the particle
    // who renderered the slot (i.e. the dom node or other container). The renderer identifies these
    // slots by entity-id (`subid`) instead. But `subid` is not unique, we need more information to
    // locate the output slot, so we embed the muxed-slot's id into our output-slot-id.
    return `${connection.targetSlot.id}___${innerArc.generateID('slot')}`;
  }

  dispose(): void {
    this.disposeObserver();
  }

  observeSlots(slotObserver) {
    this['slotObserver'] = slotObserver;
    slotObserver.dispatch = (pid, eventlet) => {
      console.log('slot-composer dispatch for pid', pid, eventlet);
      this.sendEvent(pid, eventlet);
    };
  }

  disposeObserver() {
    const observer = this['slotObserver'];
    if (observer) {
      observer.dispose();
    }
  }

  sendEvent(particleId: string, eventlet) {
    log('sendEvent:', particleId, eventlet);
    const arc = this.arc;
    if (arc && arc.activeRecipe) {
      const particle = arc.activeRecipe.findParticle(particleId);
      arc.peh.sendEvent(particle, '', eventlet);
    }
  }

  // TODO(sjmiles): could use more factoring
  delegateOutput(arc: Arc, particle: Particle, content) {
    const observer = this['slotObserver'];
    if (observer && content) {
      // we scan connections for container and slotMap
      const connections = particle.getSlandleConnections();
      // assemble a renderPacket to send to slot observer
      const packet = {};
      // identify parent container
      const container = connections[0];
      if (container) {
        Object.assign(packet, {
          containerSlotName: container.targetSlot.name,
          containerSlotId: container.targetSlot.id,
        });
      }
      // Set modality according to particle spec.
      const modality = particle.recipe.modality;
      if (!modality.all) {
        Object.assign(packet, {
          modality: modality.names.join(',')
        });
      }
      // build slot id map
      const slotMap = {};
      connections.forEach(({providedSlots}) => {
        Object.values(providedSlots).forEach(({name, id}) => slotMap[name] = id);
      });
      // finalize packet
      const pid = particle.id.toString();
      Object.assign(packet, {
        particle: {
          name: particle.name,
          id: pid
        },
        slotMap,
        // TODO(sjmiles): there is no clear concept for a particle's output channel, so there is no proper ID
        // to use. The `particle.id` works for now, but it probably should be a combo of `particle.id` and the
        // consumed slot id (neither of which are unique by themselves).
        outputSlotId: pid,
        content
      });
      //console.log(`RenderEx:delegateOutput for %c[${particle.spec.name}]::[${particle.id}]`, 'color: darkgreen; font-weight: bold;');
      observer.observe(packet, arc);
    }
  }
}
