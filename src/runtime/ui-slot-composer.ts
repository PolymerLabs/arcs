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
import {Particle} from './recipe/particle.js';
import {logsFactory} from '../platform/logs-factory.js';
import {SlotConnection} from './recipe/slot-connection.js';
import {Dictionary} from './hot.js';

type RenderPacket = {
  content?
  modality?: string
  containerSlotName?: string
  containerSlotId?: string
  slotMap?: Dictionary<string>
  particle?: {
    name: string
    id: string
  }
  outputSlotId?: string
};

const {log, warn} = logsFactory('UiSlotComposer', 'brown');

export class UiSlotComposer {
  slotObserver?;
  arc?: Arc;

  dispose(): void {
  }

  createHostedSlot(innerArc: Arc, particle: Particle, slotName: string, storeId: string): string {
    // TODO(sjmiles): this slot-id is created dynamically and was not available to the particle
    // who renderered the slot (i.e. the dom node or other container). The renderer identifies these
    // slots by entity-id (`subid`) instead. But `subid` is not unique, we need more information to
    // locate the output slot, so we embed the muxed-slot's id into our output-slot-id.
    const connection = particle.getSlandleConnections()[0];
    return `${connection.targetSlot.id}___${innerArc.generateID('slot')}`;
  }

  sendEvent(particleId: string, eventlet) {
    log('sendEvent:', this, particleId, eventlet);
    const particles = this.arc.activeRecipe.particles;
    //log('active particles: ', particles.map(p => p.id.toString()));
    const particle = particles.find(p => p.id.toString() === particleId);
    this.arc.pec.sendEvent(particle, /*slotName*/'', eventlet);
  }

  observeSlots(slotObserver) {
    this['slotObserver'] = slotObserver;
    // TODO(sjmiles): this is weird, fix
    slotObserver.dispatch = (pid, eventlet) => {
      console.log('ui-slot-composer dispatch for pid', pid, eventlet);
      this.sendEvent(pid, eventlet);
    };
  }

  delegateOutput(arc: Arc, particle: Particle, content) {
    if (content && this.slotObserver) {
      const packet = this.renderPacket(particle, content);
      this.slotObserver.observe(packet, arc);
    }
  }

  renderPacket(particle: Particle, content): RenderPacket {
    //console.log(`RenderEx:delegateOutput for %c[${particle.spec.name}]::[${particle.id}]`, 'color: darkgreen; font-weight: bold;');
    // assemble a renderPacket to send to slot observer
    const packet: RenderPacket = {content};
    // Set modality according to particle spec
    // TODO(sjmiles): particle.recipe?
    packet.modality = this.collateModalities(particle.recipe.modality);
    // will scan connections for container and slotMap
    const connections = particle.getSlandleConnections();
    // identify parent container
    const container = this.identifyContainer(connections[0]);
    Object.assign(packet, container);
    // build slot map
    packet.slotMap = this.buildSlotMap(connections);
    // acquire particle id as String
    const pid = `${particle.id}`;
    // finalize packet
    packet.particle = {
      name: particle.name,
      id: pid
    };
    // TODO(sjmiles): there is no clear concept for a particle's output channel, so there is no proper ID
    // to use. The `particle.id` works for now, but it probably should be a combo of `particle.id` and the
    // consumed slot id (neither of which are unique by themselves).
    packet.outputSlotId = pid;
    // return RenderPacket
    return packet;
  }

  collateModalities(modality) {
    // TODO(sjmiles): in the short term, Particle may also include modality hints in `content`
    return modality.all ? null : modality.names.join(',');
  }

  identifyContainer(connection) {
    if (!connection) {
      return null;
    }
    const {name, id} = connection.targetSlot;
    return {
      containerSlotName: name,
      containerSlotId: id
    };
  }

  buildSlotMap(connections: SlotConnection[]) {
    // map slots names to slot ids
    const slotMap = {};
    connections.forEach(({providedSlots}) => {
      Object.values(providedSlots).forEach(({name, id}) => slotMap[name] = id);
    });
    return slotMap;
  }
}
