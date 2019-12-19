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
import {ModalityHandler} from './modality-handler.js';
import {Modality} from './modality.js';
import {Particle} from './recipe/particle.js';
import {SlotConsumer} from './slot-consumer.js';
import {ProvidedSlotContext, SlotContext} from './slot-context.js';
import {SlotConnection} from './recipe/slot-connection.js';
import {Dictionary} from './hot.js';
import {Slot} from './recipe/slot.js';
import {logsFactory} from '../platform/logs-factory.js';

const {log, warn} = logsFactory('SlotComposer', 'brown');

export type RenderPacket = {
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
  arc?: Arc;
  slotObserver?;

  private readonly _containerKind: string;
  readonly modality: Modality;
  readonly modalityHandler: ModalityHandler;
  private readonly _consumers: SlotConsumer[] = [];
  protected _contexts: SlotContext[] = [];

  constructor(options?: SlotComposerOptions) {
    const opts = {
      containers: {'root': 'root-context'},
      modalityHandler: ModalityHandler.basicHandler,
      ...options
    };
    this.modalityHandler = opts.modalityHandler;
    const containerByName = opts.containers;
    Object.keys(containerByName).forEach(slotName => {
      this._contexts.push(ProvidedSlotContext.createContextForContainer(
        `rootslotid-${slotName}`, slotName, containerByName[slotName], [`${slotName}`]));
    });
  }

  get consumers(): SlotConsumer[] {
    return this._consumers;
  }
  get containerKind(): string {
    return this._containerKind;
  }

  getSlotConsumer(particle: Particle, slotName: string): SlotConsumer {
    return this.consumers.find(s => s.consumeConn.particle === particle && s.consumeConn.name === slotName);
  }

  findContainerByName(name: string): HTMLElement | undefined  {
    return undefined;
  }

  // TODO(sjmiles): only returns ProvidedSlotContexts, why is it called 'findContexts'?
  findContextsByName(name: string): ProvidedSlotContext[] {
    const filter = ctx => (ctx instanceof ProvidedSlotContext) && (ctx.name === name);
    return this._contexts.filter(filter) as ProvidedSlotContext[];
  }

  findContextById(slotId: string) {
    return this._contexts.find(({id}) => id === slotId) || {};
  }

  createHostedSlot(innerArc: Arc, particle: Particle, slotName: string, storeId: string): string {
    // TODO(sjmiles): this slot-id is created dynamically and was not available to the particle
    // who renderered the slot (i.e. the dom node or other container). The renderer identifies these
    // slots by entity-id (`subid`) instead. But `subid` is not unique, we need more information to
    // locate the output slot, so we embed the muxed-slot's id into our output-slot-id.
     const connection = particle.getSlandleConnections()[0];
    return `${connection.targetSlot.id}___${innerArc.generateID('slot')}`;
  }

  _addSlotConsumer(slot: SlotConsumer) {
    const pec = slot.arc.pec;
    slot.startRenderCallback = pec.startRender.bind(pec);
    slot.stopRenderCallback = pec.stopRender.bind(pec);
    this._consumers.push(slot);
  }

  async initializeRecipe(arc: Arc, recipeParticles: Particle[]) {
    const newConsumers = <SlotConsumer[]>[];
    // Create slots for each of the recipe's particles slot connections.
    recipeParticles.forEach(p => {
      p.getSlandleConnections().forEach(cs => {
        if (!cs.targetSlot) {
          assert(!cs.getSlotSpec().isRequired, `No target slot for particle's ${p.name} required consumed slot: ${cs.name}.`);
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
      // TODO(sjmiles): disabling this assert for now because rendering to unregistered slots
      // is allowed under new rendering factorisation. Maybe we bring this back as a validity
      // test in the future, but it's not a requirement atm.
      //assert(context, `No context found for ${consumer.consumeConn.getQualifiedName()}`);
      if (context && context['addSlotConsumer']) {
        context['addSlotConsumer'](consumer);
      }
    });
    // Calculate the Descriptions only once per-Arc
    const allArcs = this.consumers.map(consumer => consumer.arc);
    const uniqueArcs = [...new Set(allArcs).values()];
    // get arc -> description
    const descriptions = await Promise.all(uniqueArcs.map(arc => Description.create(arc)));
    // create a mapping from the zipped uniqueArcs and descriptions
    const consumerByArc = new Map(descriptions.map((description, index) => [uniqueArcs[index], description]));
    // ... and apply to each consumer
    for (const consumer of this.consumers) {
      consumer.description = consumerByArc.get(consumer.arc);
    }
  }

  renderSlot(particle: Particle, slotName: string, content) {
    warn('[unsupported] renderSlot', particle.spec.name);
  }

  getAvailableContexts(): SlotContext[] {
    return this._contexts;
  }

  dispose(): void {
    this.disposeConsumers();
    this.disposeContexts();
    this.disposeObserver();
  }

  disposeConsumers() {
    this._consumers.forEach(consumer => consumer.dispose());
    this._consumers.length = 0;
  }

  disposeContexts() {
    this._contexts.forEach(context => {
      context.clearSlotConsumers();
      if (context instanceof ProvidedSlotContext && context.container) {
        this.modalityHandler.slotConsumerClass.clear(context.container);
      }
    });
    this._contexts = this._contexts.filter(c => !c.sourceSlotConsumer);
  }

  // TODO(sjmiles): maybe better implemented as a slot dispose (arc dispose?) notification to
  // let client code clean up (so `slotObserver` details [like dispose()] can be hidden here?)
  disposeObserver() {
    const observer = this.slotObserver;
    if (observer) {
      observer.dispose();
    }
  }

  observeSlots(slotObserver) {
    this.slotObserver = slotObserver;
    // TODO(sjmiles): attaching an impl here is weird, fix
    slotObserver.dispatch = (pid, eventlet) => {
      console.log('ui-slot-composer dispatch for pid', pid, eventlet);
      this.sendEvent(pid, eventlet);
    };
  }

 sendEvent(particleId: string, eventlet) {
    log('sendEvent:', this, particleId, eventlet);
    const particles = this.arc.activeRecipe.particles;
    //log('active particles: ', particles.map(p => p.id.toString()));
    const particle = particles.find(p => p.id.toString() === particleId);
    this.arc.pec.sendEvent(particle, /*slotName*/'', eventlet);
  }

  _findConsumer(id) {
    return this.consumers.find(consumer => consumer.consumeConn.particle.id.toString() === id);
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
    // we use connections to find container and build slotMap
    const connections = particle.getSlandleConnections();
    // identify parent container
    const container = this.identifyContainer(connections[0]);
    Object.assign(packet, container);
    // build slot map
    packet.slotMap = this.buildSlotMap(connections);
    // acquire particle id as String
    const pid = `${particle.id}`;
    // attach particle info
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
