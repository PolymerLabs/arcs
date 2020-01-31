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
import {RenderPacket} from '../slot-observer.js';
import {AbstractSlotObserver} from '../slot-observer.js';

const logging = false;
const log = !logging ? (...args) => {} : console.log.bind(console, 'SlotTestObserver::');

type SlotTestObserverOptions = {
  strict?: boolean;
  logging?: boolean;
};

/**
 * A helper SlotObserver allowing expressing and asserting expectations on slot rendering.
 * Usage example:
 *   observer
 *       .newExpectations()
 *           .expectRenderSlot('MyParticle1', 'mySlot1');
 *           .expectRenderSlot('MyParticle1', 'mySlot1', {times: 2})
 *           .expectRenderSlot('MyParticle2', 'mySlot2', {verify: (content) => !!content.myParam})
 *           .expectRenderSlot('MyOptionalParticle', 'myOptionalSlot', {isOptional: true})
 *   await observer.expectationsCompleted();
 */
export class SlotTestObserver extends AbstractSlotObserver {
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
  constructor(options: SlotTestObserverOptions = {}) {
    super();
    this.expectQueue = [];
    this.onExpectationsComplete = () => undefined;
    this.strict = options.strict != undefined ? options.strict : true;
    this.logging = Boolean(options.logging);
    this.debugMessages = [];
  }

  /**
   * Reinitializes expectations queue.
   */
  newExpectations(name?: string) {
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
  expectRenderSlot(particleName, slotName, options?) {
    options = options || {};
    const times = options.times || 1;
    for (let i = 0; i < times; ++i) {
      this.addRenderExpectation({
        particleName,
        slotName,
        isOptional: options.isOptional,
        hostedParticle: options.hostedParticle,
        verifyComplete: options.verify,
        ignoreUnexpected: options.ignoreUnexpected
      });
    }
    return this;
  }

  addRenderExpectation(expectation) {
    //let current = this.expectQueue.find(e =>
    //   e.particleName === expectation.particleName
    //   && e.slotName === expectation.slotName
    //   && e.hostedParticle === expectation.hostedParticle
    //   && e.isOptional === expectation.isOptional
    // );
    // if (!current) {
      const {particleName, slotName, hostedParticle, isOptional, ignoreUnexpected, verifyComplete} = expectation;
      const toString = () => `render:${isOptional ? '  optional' : ' '} ${particleName}:${slotName} ${hostedParticle}`; // ${contentTypes}`
      const current = {
        type: 'render',
        particleName,
        slotName,
        hostedParticle,
        isOptional,
        ignoreUnexpected,
        toString,
        verifyComplete
      };
      this.expectQueue.push(current);
    // }
    // if (expectation.verifyComplete) {
    //   assert(!current.verifyComplete);
    //   current.verifyComplete = expectation.verifyComplete;
    // }
    //current.contentTypes = (current.contentTypes || []).concat(expectation.contentTypes);
    return this;
  }

  /**
   * Returns promise to completion of all expectations.
   */
  async expectationsCompleted(): Promise<void> {
    if (this.onlyOptionalExpectations()) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.onExpectationsComplete = resolve;
    });
  }

  assertExpectationsCompleted() {
    if (this.onlyOptionalExpectations()) {
      return true;
    }
    assert(false, `${this.debugMessagesToString()}\nremaining expectations:\n ${this.expectQueue.map(expect => `  ${expect.toString()}`).join('\n')}`);
    return undefined;
  }

  onlyOptionalExpectations() {
    return (this.expectQueue.length === 0 || this.expectQueue.every(e => e.isOptional));
  }

  //TODO: reaching directly into data objects like this is super dodgy and we should
  // fix. It's particularly bad here as there's no guarantee that the backingStore
  // exists - should await ensureBackingStore() before accessing it.
  // _getHostedParticleNames(particle: Particle) {
  //   return Object.values(particle.connections)
  //       .filter(conn => conn.type instanceof InterfaceType)
  //       .map(conn => {
  //         const allArcs = this.consumers.reduce((arcs, consumer) => arcs.add(consumer.arc), new Set<Arc>());
  //         const store = [...allArcs].map(arc => arc.findStoreById(conn.handle.id)).find(store => !!store) as StorageProviderBase;
  //         if (store.referenceMode) {
  //           // TODO(cypher1): Unsafe. _stored does not exist on StorageProviderBase.
  //           // tslint:disable-next-line: no-any
  //           return store.backingStore._model.getValue((store as any)._stored.id).name;
  //         }
  //         // TODO(cypher1): Unsafe. _stored does not exist on StorageProviderBase.
  //         // tslint:disable-next-line: no-any
  //         return (store as any)._stored.name;
  //       });
  // }

  observe(packet: RenderPacket) {
    const {particle, containerSlotName: slotName, content} = packet;

    log(`observe: ${particle.name}:${slotName}`);
    log('queue:', this.expectQueue.map(e => `${e.particleName}:${e.slotName}`).join(','));

    //const names = this._getHostedParticleNames(particle);
    //const nameJoin = names.length > 0 ? `(${names.join(',')}) ` : '(no-names)';
    const nameJoin = '(names not available)';
    this.addDebugMessages(`    renderSlot ${particle.name} ${nameJoin}: ${slotName} - ${Object.keys(content).join(', ')}`);

    assert.isAbove(this.expectQueue.length, 0,
      `observed a render packet for ${particle.name}:${slotName}}), but not expecting anything further. Enable {strict: false, logging: true} to diagnose`);

    const found = this.verifyRenderContent(particle, slotName, content);
    if (!found) {
      const canIgnore = this.canIgnore(particle.name, slotName, content);
      const info = `${particle.name}:${slotName}`; // (content types: ${Object.keys(content).join(', ')})`;
      if (canIgnore && !SlotTestObserver['warnedIgnore']) {
        SlotTestObserver['warnedIgnore'] = true;
        console.log(`Skipping unexpected render slot request: ${info}`);
        console.log('expected? add this line:');
        console.log(`  .expectRenderSlot('${particle.name}', '${slotName}', {'contentTypes': ['${Object.keys(content).join('\', \'')}']})`);
        console.log(`(additional warnings are suppressed)`);
      }
      //console.log('slot-test-observer: queue:', this.expectQueue);
      assert(canIgnore, `Unexpected render slot ${info}`);
    }
    this.expectationsMet();
    this.detailedLogDebug();
  }

  verifyRenderContent(particle, slotName, content) {
    const index = this.expectQueue.findIndex(e =>
      e.type === 'render'
      && e.particleName === particle.name
      && e.slotName === slotName
      // && (!e.hostedParticle || ((names) => names.length === 1 && names[0] === e.hostedParticle)(this._getHostedParticleNames(particle)));
    );
    if (index < 0) {
      return false;
    }
    const expectation = this.expectQueue[index];
    let found = true;
    let complete = true;
    if (expectation.verifyComplete) {
      found = true;
      complete = expectation.verifyComplete(content);
    }
    if (complete) {
      this.expectQueue.splice(index, 1);
    }
    return found;
  }

  canIgnore(particleName: string, slotName: string, content): boolean {
    // TODO: add support for ignoring specific particles and/or slots.
    return this.expectQueue.find(e => e.type === 'render' && e.ignoreUnexpected);
  }

  expectationsMet(): void {
    if (this.expectQueue.length === 0 || this.onlyOptionalExpectations()) {
      this.onExpectationsComplete();
    }
  }

  detailedLogDebug() {
    const expect = {};
    this.expectQueue.forEach(e => {
      if (!expect[e.particleName]) {
        expect[e.particleName] = {};
      }
    });
    this.addDebugMessages(`${this.expectQueue.length} expectations : {${Object.keys(expect).map(p => {
      return `${p}: (${Object.keys(expect[p]).map(key => `${key}=${expect[p][key]}`).join('; ')})`;
    }).join(', ')}}`);
    return this;
  }

  addDebugMessages(message) {
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
