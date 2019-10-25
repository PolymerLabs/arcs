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
import {logsFactory} from './log-factory.js';

const {log, warn} = logsFactory('UiSlotComposer', 'brown');

export type SlotComposerOptions = {
  modalityName?: string;
  modalityHandler?: ModalityHandler;
  noRoot?: boolean;
  rootContainer?;
  rootContext?;
  containerKind?: string;
  containers?;
};

export class UiSlotComposer {
  private readonly _containerKind: string;
  readonly modality: Modality;
  readonly modalityHandler: ModalityHandler;
  private readonly _consumers: SlotConsumer[] = [];
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
    const opts = {
      containers: {'root': 'root-context'},
      modalityHandler: ModalityHandler.basicHandler,
      ...options
    };

    // TODO: Support rootContext for backward compatibility, remove when unused.
    // options.rootContainer = options.rootContainer || options.rootContext || (options.containers || Object).root;
    // assert((options.rootContainer !== undefined)
    //        !==
    //        (options.noRoot === true),
    //   'Root container is mandatory unless it is explicitly skipped');
    // this._containerKind = options.containerKind;
    // if (options.modalityName) {
    //   this.modality = Modality.create([options.modalityName]);
    // }
    this.modalityHandler = opts.modalityHandler;

    //if (opts.noRoot) {
    //  return;
    //}

    const containerByName =
        opts.containers
        //|| this.findRootContainers(options.rootContainer)
        //|| {}
        ;
    //if (Object.keys(containerByName).length === 0) {
      // fallback to single 'root' slot using the rootContainer.
      //containerByName['root'] = opts.rootContainer;
    //}

    Object.keys(containerByName).forEach(slotName => {
      this._contexts.push(ProvidedSlotContext.createContextForContainer(
        `rootslotid-${slotName}`, slotName, containerByName[slotName], [`${slotName}`]));
    });
  }

  // findRootContainers(rootContainer) {
  //   return this.modalityHandler.slotConsumerClass.findRootContainers(rootContainer)
  // }

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
    // const contexts = this.findContextsByName(name);
    // if (contexts.length === 0) {
    //   // TODO this is a no-op, but throwing here breaks tests
    //   console.warn(`No containers for '${name}'`);
    // } else if (contexts.length === 1) {
    //   return contexts[0].container;
    // }
    // console.warn(`Ambiguous containers for '${name}'`);
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
    const slotConsumer = this.getSlotConsumer(particle, slotName);
    assert(slotConsumer, `Transformation particle ${particle.name} with consumed ${slotName} not found`);
    // TODO(sjmiles): this slot-id is created dynamically and was not available to the particle
    // who renderered the slot (i.e. the dom node or other container). The renderer identifies these
    // slots by entity-id (`subid`) instead. But `subid` is not unique, we need more information to
    // locate the output slot, so we embed the muxed-slot's id into our output-slot-id.
    const hostedSlotId = `${slotConsumer.slotContext.id}___${innerArc.generateID('slot')}`;
    //this._contexts.push(new HostedSlotContext(hostedSlotId, slotConsumer, storeId));
    return hostedSlotId;
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

  // TODO(sjmiles): experimental slotObserver stuff below here

  observeSlots(slotObserver) {
    this['slotObserver'] = slotObserver;
    // TODO(sjmiles): this is weird, fix
    slotObserver.dispatch = (pid, eventlet) => {
      console.log('ui-slot-composer dispatch for pid', pid, eventlet);
      this.sendEvent(pid, eventlet);
    };
  }

  // TODO(sjmiles): maybe better implemented as a slot dispose (arc dispose?) notification to
  // let client code clean up (so `slotObserver` details [like dispose()] can be hidden here)
  disposeObserver() {
    const observer = this['slotObserver'];
    if (observer) {
      observer.dispose();
    }
  }

  sendEvent(particleId: string, eventlet) {
    log('sendEvent:', particleId, eventlet);
    const consumer = this._findConsumer(particleId);
    if (consumer) {
      const particle = consumer.consumeConn.particle;
      const arc = consumer.arc;
      if (arc) {
        //log('firing PEC event for', particle.name);
        // TODO(sjmiles): we need `arc` and `particle` here even though
        // the two are bound together, simplify
        log('... found consumer, particle, and arc to delegate sendEvent');
        arc.pec.sendEvent(particle, /*slotName*/'', eventlet);
      }
    } else {
      warn('...found no consumer!');
    }
  }

  _findConsumer(id) {
    return this.consumers.find(consumer => consumer.consumeConn.particle.id.toString() === id);
  }

  // TODO(sjmiles): needs factoring
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
      // Set modality according to particle spec
      // TODO(sjmiles): in the short term, Particle may also include modality hints in `content`
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
