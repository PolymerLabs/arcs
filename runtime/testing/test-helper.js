/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from '../test/chai-web.js';
import {Arc} from '../arc.js';
import {Manifest} from '../manifest.js';
import {Loader} from '../loader.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Planner} from '../planner.js';
import {Random} from '../random.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {MessageChannel} from '../message-channel.js';
import {InnerPEC} from '../inner-PEC.js';

/** @class TestHelper
 * Helper class to recipe instantiation and replanning.
 * Usage example:
 *   let helper = await TestHelper.loadManifestAndPlan('my.manifest');
 *   await helper.acceptSuggestion({particles: ['MyParticle1', 'MyParticle2']});
 *   await helper.verifyData('MyParticle1', 'myHandle1', async (handle) => { ... });
 */
export class TestHelper {
  /**
   * Initializes a single arc using a mock slot composer.
   * |options| may contain:
   *   - slotComposerStrict: whether mock slot composer will be executing in strict mode.
   *   - logging: whether to log execution progress (default: false).
   */
  constructor(options) {
    options = options || {};
    let loader = options.loader || new Loader();
    this.slotComposer = new MockSlotComposer({strict: options ? options.slotComposerStrict : undefined});
    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new InnerPEC(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    this.loader = loader;

    this.arc = new Arc({
      id: 'demo',
      pecFactory,
      slotComposer: this.slotComposer,
      loader: this.loader
    });
    this.slotComposer.pec = this.arc.pec;
    this.logging = options.logging;
  }

  /** @static @method loadManifestAndPlan(manifestFilename, options)
   * Creates and returns a TestHelper instance, loads a manifest file and makes planning.
   */
  static async loadManifestAndPlan(manifestFilename, options) {
    let helper = new TestHelper(options);
    await helper.loadManifest(manifestFilename);
    await helper.makePlans(options);
    return helper;
  }

  /** @static @method parseManifestAndPlan(manifestFilename, options)
   * Creates and returns a TestHelper instance, parses a manifest string and makes planning.
   */
  static async parseManifestAndPlan(manifestString, options) {
    options = options || {};
    options.loader = options.loader || new StubLoader({
      '*': `defineParticle(({Particle}) => { return class P extends Particle {} });`
    });
    let helper = new TestHelper(options);
    await helper.parseManifest(manifestString);
    await helper.makePlans(options);
    return helper;
  }

  /** @method loadManifest(manifestFilename)
   * Loads a manifest file into the arc's context.
   */
  async loadManifest(manifestFilename) {
    this.arc._context = await Manifest.load(manifestFilename, this.loader);
    return this;
  }

  /** @method parseManifest(manifestString)
   * Parses a manifest string into the arc's context.
   */
  async parseManifest(manifestString) {
    this.arc._context = await Manifest.parse(manifestString, this.loader);
    return this;
  }

  /** @method makePlans(options)
   * Generates suggestions for the arc.
   * |options| contains possible verifications to be performed on the generated plans:
   *   - expectedNumPlans: (optional) number of expected number of generated suggestions to verify.
   *   - expectedSuggestions: (optional) list of expected description texts representing the generated suggestion.
   *   - verify: a handler method to be called to verify the resulting suggestions.
   */
  async makePlans(options) {
    let planner = new Planner();
    planner.init(this.arc);
    this.plans = await planner.suggest();
    if (options) {
      if (options.expectedNumPlans) {
        assert.equal(options.expectedNumPlans, this.plans.length);
      }
      if (options.expectedSuggestions) {
        let suggestions = await Promise.all(this.plans.map(async p => await p.description.getRecipeSuggestion()));
        let missingSuggestions = options.expectedSuggestions.filter(expectedSuggestion => !suggestions.find(s => s === expectedSuggestion));
        let unexpectedSuggestions = suggestions.filter(suggestion => !options.expectedSuggestions.find(s => s === suggestion));
        let errors = [];
        if (missingSuggestions.length > 0) {
          errors.push(`Missing suggestions:\n\t ${missingSuggestions.join('\n\t')}`);
        }
        if (unexpectedSuggestions.length > 0) {
          errors.push(`Unexpected suggestions:\n\t ${unexpectedSuggestions.join('\n\t')}`);
        }
        assert.equal(0, missingSuggestions.length + unexpectedSuggestions.length, errors.join('\n'));
      }
      if (options.verify) {
        await options.verify(this.plans);
      }
    }
    this.log(`Made ${this.plans.length} plans.`);
    return this;
  }

  /** @method acceptSuggestion(options)
   * Accepts a suggestion. |options| may provide the exact list of particles representing the
   * suggestion to accept. Otherwise, fallback to a single generated suggestion, if appropriate.
   */
  async acceptSuggestion(options) {
    let plan;
    if (options) {
      if (options.particles) {
        let plans = this.plans.filter(p => {
          let planParticles = p.plan.particles.map(particle => particle.name);
          return planParticles.length == options.particles.length && planParticles.every(p => options.particles.includes(p));
        });
        if (options.hostedParticles) {
          plans = plans.filter(p => {
            return options.hostedParticles.every(hosted => {
              let interfaceHandles = p.plan.handles.filter(h => h.type.isInterface);
              return interfaceHandles.find(handle => this.arc.findStoreById(handle.id)._stored.name == hosted);
            });
          });
        }
        assert.equal(1, plans.length);
        plan = plans[0];
      } else if (options.descriptionText) {
        plan = this.plans.find(p => p.descriptionText == options.descriptionText);
      }
    }
    if (!plan) {
      assert.equal(1, this.plans.length);
      plan = this.plans[0];
    }
    this.log(`Accepting suggestion: '${((str) => str.length > 50 ? str.substring(0, Math.min(str.length, 50)).concat('...') : str)(plan.descriptionText)}'`);
    await this.instantiatePlan(plan.plan);
  }

  async instantiatePlan(plan) {
    assert(plan, `Cannot accept suggestion, no plan could be selected.`);
    await this.arc.instantiate(plan);
    await this.idle();
  }

  /** @method plan
   * Getter for a single available suggestion plan (fails, if there is more than one).
   */
  get plan() {
    assert.equal(1, this.plans.length);
    return this.plans[0].plan;
  }

  /** @method sendSlotEvent(particleName, slotName, event, data)
   * Sends an event to particle's slot via the slot composer.
   */
  async sendSlotEvent(particleName, slotName, event, data) {
    this.log(`Sending event '${event}' to ${particleName}:${slotName}`);

    this.slotComposer.sendEvent(particleName, slotName, event, data);
    await this.idle();
  }

  /** @method idle
   * Awaits particle execution context idleness and mock slot composer expectations completeness.
   */
  async idle() {
    await this.arc.pec.idle;
    await this.slotComposer.expectationsCompleted();
  }

  /** @method verifyData(particleName, connectionName, expectationHandler)
   * Verifies data in handle |connectionName| of |particleName| with the given handler.
   */
  async verifyData(particleName, connectionName, expectationHandler) {
    let particle = this.arc.activeRecipe.particles.find(p => p.name == particleName);
    assert(particle, `Particle ${particle} doesn't exist in active recipe`);
    assert(particle.connections[connectionName], `Connection ${connectionName} doesn't existing in particle ${particleName}`);
    let handleId = particle.connections[connectionName].handle.id;
    assert(handleId, `No handle ID for ${particleName}::${connectionName}`);
    let handle = this.arc.findStoreById(handleId);
    assert(handle, `Handle '${handleId}' (${particleName}::${connectionName}) not found in active recipe`);

    return new Promise((resolve, reject) => {
      // TODO: setTimeout is needed, because pec becomes idle before hosted particles complete. Get rid of it.
      setTimeout(async () => {
        await expectationHandler(handle);
        resolve();
      }, 100);
    });
  }

  /** @method verifySetSize(particleName, connectionName, expectedSetSize)
   * Verifies the size of data collection in handle |connectionName| of |particleName|.
   */
  async verifySetSize(particleName, connectionName, expectedSetSize) {
    this.log(`Verifying ${particleName}:${connectionName} size is: ${expectedSetSize}`);
    return this.verifyData(particleName, connectionName, async (handle) => {
      assert.equal(expectedSetSize, (await handle.toList()).length, `${particleName}:${connectionName} expected size ${expectedSetSize}`);
    });
  }

  verifySlots(numSlots, verifyHandler) {
    assert.equal(numSlots, this.slotComposer._slots.length);
    this.slotComposer._slots.forEach(s => verifyHandler(s.consumeConn.particle.name, s.consumeConn.name, s._content));
  }

  // TODO: add more helper methods to verify data and slots.

  log(message) {
    if (this.logging) {
      console.log(message);
    }
  }
}
