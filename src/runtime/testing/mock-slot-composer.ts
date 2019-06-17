/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Particle} from '../recipe/particle.js';
import {SlotComposerOptions} from '../slot-composer.js';
import {HeadlessSlotDomConsumer} from '../headless-slot-dom-consumer.js';
import {InterfaceType} from '../type.js';
import {Arc} from '../arc.js';

import {FakeSlotComposer} from './fake-slot-composer.js';
import {StorageProviderBase} from '../storage/storage-provider-base.js';

const logging = false;
const log = !logging ? () => {} : console.log.bind(console, '---------- MockSlotComposer::');

type MockSlotComposerOptions = {
  strict?: boolean;
  logging?: boolean;
};

/**
 * A helper SlotComposer allowing expressing and asserting expectations on slot rendering.
 * Usage example:
 *   mockSlotComposer
 *       .newExpectations()
 *           .expectRenderSlot('MyParticle1', 'mySlot1', {contentTypes: ['template']});
 *           .expectRenderSlot('MyParticle1', 'mySlot1', {contentTypes: ['model'], times: 2})
 *           .expectRenderSlot('MyParticle2', 'mySlot2', {verify: (content) => !!content.myParam})
 *           .expectRenderSlot('MyOptionalParticle', 'myOptionalSlot', {contentTypes: ['template', 'model'], isOptional: true})
 *   mockSlotComposer.sendEvent('MyParticle1', 'mySlot1', '_onMyEvent', {key: 'value'});
 *   await mockSlotComposer.expectationsCompleted();
 */
export class MockSlotComposer extends FakeSlotComposer {
  private expectQueue;
  onExpectationsComplete;
  strict: boolean;
  logging: boolean;
  debugMessages;
  pec;

  /**
   * |options| may contain:
   * - strict: whether unexpected render slot requests cause an assert or a warning log (default: true)
   */
  constructor(options: SlotComposerOptions & MockSlotComposerOptions = {}) {
    super(options);
    this.expectQueue = [];
    this.onExpectationsComplete = () => undefined;
    this.strict = options.strict != undefined ? options.strict : true;
    this.logging = Boolean(options.logging);
    this.debugMessages = [];

    // Clear all cached templates
    HeadlessSlotDomConsumer.clearCache();
  }

   // Overriding this method to investigate AppVeyor failures.
   // TODO: get rid of it once the problem is fixed.
  _addSlotConsumer(slot) {
    super._addSlotConsumer(slot);
    const startCallback = slot.startRenderCallback;
    slot.startRenderCallback = ({particle, slotName, providedSlots, contentTypes}) => {
      this._addDebugMessages(`  StartRender: ${slot.consumeConn.getQualifiedName()}`);
      startCallback({particle, slotName, providedSlots, contentTypes});
    };
  }

  /**
   * Reinitializes expectations queue.
   */
  newExpectations(name?: string): MockSlotComposer {
    assert(this.expectQueue.every(e => e.isOptional));
    this.expectQueue = [];

    if (!this.strict) {
      this.ignoreUnexpectedRender();
    }
    this.debugMessages.push({name: name || `debug${Object.keys(this.debugMessages).length}`, messages: []});
    return this;
  }

  /**
   * Allows ignoring unexpected render slot requests.
   */
  ignoreUnexpectedRender() {
    this.expectQueue.push({type: 'render', ignoreUnexpected: true, isOptional: true,
                           toString: () => `render: ignoreUnexpected optional`});
    return this;
  }

  /**
   * Returns true, if the number of items in content's model is equal to the given number.
   */
  expectContentItemsNumber(num: number, content) {
    assert(content.model, `Content doesn't have model`);
    assert(content.model.items, `Content model doesn't have items (${num} expected}`);
    assert(content.model.items.length <= num, `Too many items (${content.model.items.length}), while only ${num} were expected.`);
    return content.model.items.length === num;
  }

  /**
   * Adds a rendering expectation for the given particle and slot names, where options may contain:
   * times: number of time the rendering request will occur
   * contentTypes: the types appearing in the rendering content
   * isOptional: whether this expectation is optional (default: false)
   * hostedParticle: for transformation particles, the name of the hosted particle
   * verify: an additional optional handler that determines whether the incoming render request satisfies the expectation
   */
  expectRenderSlot(particleName, slotName, options) {
    const times = options.times || 1;
    for (let i = 0; i < times; ++i) {
      this._addRenderExpectation({
        particleName,
        slotName,
        contentTypes: options.contentTypes,
        isOptional: options.isOptional,
        hostedParticle: options.hostedParticle,
        verifyComplete: options.verify,
        ignoreUnexpected: options.ignoreUnexpected
      });
    }
    return this;
  }

  /**
   * Returns promise to completion of all expectations.
   */
  expectationsCompleted() {
    if (this.expectQueue.length === 0 || this.expectQueue.every(e => e.isOptional)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => this.onExpectationsComplete = resolve);
  }

  assertExpectationsCompleted() {
    if (this.expectQueue.length === 0 || this.expectQueue.every(e => e.isOptional)) {
      return true;
    }
    assert(false, `${this.debugMessagesToString()}\nremaining expectations:\n ${this.expectQueue.map(expect => `  ${expect.toString()}`).join('\n')}`);
   return undefined;
  }

  /**
   * Sends an event to the given particle and slot.
   */
  sendEvent(particleName, slotName, event, data) {
    const particles = this.consumers.filter(s => s.consumeConn.particle.name === particleName).map(s => s.consumeConn.particle);
    assert(1 === particles.length, `Multiple particles with name ${particleName} - cannot send event.`);
    this.pec.sendEvent(particles[0], slotName, {handler: event, data});
  }

  _addRenderExpectation(expectation) {
    let current = this.expectQueue.find(e => {
      return e.particleName === expectation.particleName
          && e.slotName === expectation.slotName
          && e.hostedParticle === expectation.hostedParticle
          && e.isOptional === expectation.isOptional;
    });
    if (!current) {
      current = {type: 'render', particleName: expectation.particleName, slotName: expectation.slotName, hostedParticle: expectation.hostedParticle, isOptional: expectation.isOptional, ignoreUnexpected: expectation.ignoreUnexpected,
                 toString: () => `render:${expectation.isOptional ? '  optional' : ' '} ${expectation.particleName} ${expectation.slotName} ${expectation.hostedParticle} ${current.contentTypes}`};
      this.expectQueue.push(current);
    }
    if (expectation.verifyComplete) {
      assert(!current.verifyComplete);
      current.verifyComplete = expectation.verifyComplete;
    }
    current.contentTypes = (current.contentTypes || []).concat(expectation.contentTypes);
    return this;
  }

  _canIgnore(particleName: string, slotName: string, content): boolean {
    // TODO: add support for ignoring specific particles and/or slots.
    return this.expectQueue.find(e => e.type === 'render' && e.ignoreUnexpected);
  }

  //TODO: reaching directly into data objects like this is super dodgy and we should
  // fix. It's particularly bad here as there's no guarantee that the backingStore
  // exists - should await ensureBackingStore() before accessing it.
  _getHostedParticleNames(particle: Particle) {
    return Object.values(particle.connections)
        .filter(conn => conn.type instanceof InterfaceType)
        .map(conn => {
          const allArcs = this.consumers.reduce((arcs, consumer) => arcs.add(consumer.arc), new Set<Arc>());
          const store = [...allArcs].map(arc => arc.findStoreById(conn.handle.id)).find(store => !!store) as StorageProviderBase;
          if (store.referenceMode) {
            // TODO(cypher1): Unsafe. _stored does not exist on StorageProviderBase.
            // tslint:disable-next-line: no-any
            return store.backingStore._model.getValue((store as any)._stored.id).name;
          }
          // TODO(cypher1): Unsafe. _stored does not exist on StorageProviderBase.
          // tslint:disable-next-line: no-any
          return (store as any)._stored.name;
        });
  }

  _verifyRenderContent(particle, slotName, content) {
    const index = this.expectQueue.findIndex(e => {
      return e.type === 'render'
          && e.particleName === particle.name
          && e.slotName === slotName
          && (!e.hostedParticle ||
             ((names) => names.length === 1 && names[0] === e.hostedParticle)(this._getHostedParticleNames(particle)));
    });
    if (index < 0) {
      return false;
    }
    const expectation = this.expectQueue[index];

    let found = false;
    let complete = false;
    if (expectation.verifyComplete) {
      found = true;
      complete = expectation.verifyComplete(content);
    } else if (expectation.contentTypes) {
      Object.keys(content).forEach(contentType => {
        const contentIndex = expectation.contentTypes.indexOf(contentType);
        found = found || (contentIndex >= 0);
        if (contentIndex >= 0) {
          expectation.contentTypes.splice(contentIndex, 1);
        }
      });
      complete = expectation.contentTypes.length === 0;
    } else {
      assert(false, `Invalid expectation: ${JSON.stringify(expectation)}`);
    }

    if (complete) {
      this.expectQueue.splice(index, 1);
    }
    return found;
  }

  renderSlot(particle, slotName, content) {
    this._addDebugMessages(`    renderSlot ${particle.name} ${((names) => names.length > 0 ? `(${names.join(',')}) ` : '')(this._getHostedParticleNames(particle))}: ${slotName} - ${Object.keys(content).join(', ')}`);
    assert.isAbove(this.expectQueue.length, 0,
      `Got a renderSlot from ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')}), but not expecting anything further. Enable {strict: false, logging: true} to diagnose`);

    // renderSlot must happen before _verifyRenderContent, because the latter removes this call from expectations,
    // and potentially making mock-slot-composer idle before the renderSlot has actualy complete.
    // TODO: split _verifyRenderContent to separate method for checking and then resolving expectations.
    super.renderSlot(particle, slotName, content);

    const found = this._verifyRenderContent(particle, slotName, content);
    if (!found) {
      const canIgnore = this._canIgnore(particle.name, slotName, content);
      if (canIgnore && !MockSlotComposer['warnedIgnore']) {
        MockSlotComposer['warnedIgnore'] = true;
        console.log(`Skipping unexpected render slot request: ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')})`);
        console.log('expected? add this line:');
        console.log(`  .expectRenderSlot('${particle.name}', '${slotName}', {'contentTypes': ['${Object.keys(content).join('\', \'')}']})`);
        console.log(`(additional warnings are suppressed)`);
      }
      assert(canIgnore, `Unexpected render slot ${slotName} for particle ${particle.name} (content types: ${Object.keys(content).join(',')})`);
    }

    this._expectationsMet();
    this.detailedLogDebug();
  }

  _expectationsMet(): void {
    if (this.expectQueue.length === 0 || this.expectQueue.every(e => e.isOptional)) {
      this.onExpectationsComplete();
    }
  }

  detailedLogDebug() {
    const expectationsByParticle = {};
    this.expectQueue.forEach(e => {
      if (!expectationsByParticle[e.particleName]) {
        expectationsByParticle[e.particleName] = {};
      }
      if (e.contentTypes) {
        e.contentTypes.forEach(contentType => {
          const key = `${e.isOptional ? 'opt_' : ''}${contentType}`;
          if (!expectationsByParticle[e.particleName][key]) {
            expectationsByParticle[e.particleName][key] = 0;
          }
          expectationsByParticle[e.particleName][key]++;
        });
      }
    });
    this._addDebugMessages(`${this.expectQueue.length} expectations : {${Object.keys(expectationsByParticle).map(p => {
      return `${p}: (${Object.keys(expectationsByParticle[p]).map(key => `${key}=${expectationsByParticle[p][key]}`).join('; ')})`;
    }).join(', ')}}`);
    return this;
  }

  _addDebugMessages(message) {
    assert(this.debugMessages.length > 0, 'debugMessages length is 0');
    this.debugMessages[this.debugMessages.length - 1].messages.push(message);
    if (this.logging) {
      console.log(message);
    }
  }

  debugMessagesToString(): string {
    const result: string[] = [];
    result.push('--------------------------------------------');
    this.debugMessages.forEach(debug => {
      result.push(`${debug.name} : `);
      debug.messages.forEach(message => result.push(message));
      result.push('----------------------');
    });
    return result.join('\n');
  }
}
