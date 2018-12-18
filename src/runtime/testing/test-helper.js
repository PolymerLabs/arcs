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
import {InterfaceType} from '../type.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {MessageChannel} from '../message-channel.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {ParticleExecutionContext} from '../particle-execution-context.js';
import {Planner} from '../planner.js';
import {RecipeIndex} from '../recipe-index.js';

/** @class TestHelper
 * Helper class to recipe instantiation and replanning.
 * Usage example:
 *   let helper = await TestHelper.createAndPlan({manifestFilename: 'my.manifest'});
 *   await helper.acceptSuggestion({particles: ['MyParticle1', 'MyParticle2']});
 *   await helper.verifyData('MyParticle1', 'myHandle1', async (handle) => { ... });
 */
export class TestHelper {

  /**
   * Initializes a single arc using a mock slot composer.
   * |options| may contain:
   *   - slotComposerStrict: whether mock slot composer will be executing in strict mode.
   *   - logging: whether to log execution progress (default: false).
   *   - loader: file loader to use.
   *   - context: Manifest object.
   *   - manifestFilename: filename of the manifest file to load as the context.
   *   - manifestString: a string with content of the manifest to load as the context.
   */
  static async create(options = {}) {
    const loader = options.loader || new Loader();
    if (options.manifestFilename) {
      assert(!options.context, 'context should not be provided if manifestFilename is given');
      options.context = await Manifest.load(options.manifestFilename, loader);
    }
    if (options.manifestString) {
      assert(!options.context, 'context should not be provided if manifestString is given');
      options.context = await TestHelper.parseManifest(options.manifestString, loader);
    }

    // Explicitly not using a constructor to force using this factory method.
    const helper = new TestHelper();
    helper.slotComposer = options.slotComposer || new MockSlotComposer({strict: options.slotComposerStrict, logging: options.logging});
    helper.loader = loader;
    helper.arc = new Arc({
      id: 'demo',
      slotComposer: helper.slotComposer,
      loader: helper.loader,
      context: options.context
    });
    if (options.storageKey) {
      helper.arc.storageKey = options.storageKey;
    }
    helper.slotComposer.pec = helper.arc.pec;
    helper.recipeIndex = RecipeIndex.create(helper.arc);
    helper.logging = options.logging;

    return helper;
  }

  static async parseManifest(manifestString, loader) {
    return await Manifest.parse(manifestString, {loader, fileName: ''});
  }

  /**
   * Creates a Test Helper instances and triggers planning .
   */
  static async createAndPlan(options) {
    const helper = await TestHelper.create(options);
    await helper.makePlans(options);
    return helper;
  }

  setTimeout(timeout) {
    this.timeout = setTimeout(() => this.slotComposer.assertExpectationsCompleted(), timeout);
  }

  clearTimeout() {
    clearTimeout(this.timeout);
  }

  /** @method makePlans(options)
   * Generates suggestions for the arc.
   * |options| contains possible verifications to be performed on the generated plans:
   *   - expectedNumPlans: (optional) number of expected number of generated suggestions to verify.
   *   - expectedSuggestions: (optional) list of expected description texts representing the generated suggestion.
   *   - verify: a handler method to be called to verify the resulting suggestions.
   */
  async makePlans(options) {
    const planner = new Planner();
    planner.init(this.arc, {strategyArgs: {recipeIndex: this.recipeIndex}});
    this.suggestions = await planner.suggest();
    if (options) {
      if (options.expectedNumPlans) {
        assert.lengthOf(this.suggestions, options.expectedNumPlans);
      }
      if (options.expectedSuggestions) {
        const suggestions = this.suggestions.map(s => s.descriptionText);
        const missingSuggestions = options.expectedSuggestions.filter(expectedSuggestion => !suggestions.find(s => s === expectedSuggestion));
        const unexpectedSuggestions = suggestions.filter(suggestion => !options.expectedSuggestions.find(s => s === suggestion));
        const errors = [];
        if (missingSuggestions.length > 0) {
          errors.push(`Missing suggestions:\n\t ${missingSuggestions.join('\n\t')}`);
        }
        if (unexpectedSuggestions.length > 0) {
          errors.push(`Unexpected suggestions:\n\t ${unexpectedSuggestions.join('\n\t')}`);
        }
        assert.equal(0, missingSuggestions.length + unexpectedSuggestions.length, errors.join('\n'));
      }
      if (options.verify) {
        await options.verify(this.suggestions);
      }
    }
    this.log(`Made ${this.suggestions.length} plans.`);
    return this;
  }

  /** @method acceptSuggestion(options)
   * Accepts a suggestion. |options| may provide the exact list of particles representing the
   * suggestion to accept. Otherwise, fallback to a single generated suggestion, if appropriate.
   */
  async acceptSuggestion(options) {
    let suggestion;
    if (options) {
      if (options.particles) {
        let suggestions = this.findSuggestionByParticleNames(options.particles);
        if (options.hostedParticles) {
          suggestions = suggestions.filter(p => {
            return options.hostedParticles.every(hosted => {
              const interfaceHandles = p.plan.handles.filter(h => h.type instanceof InterfaceType);
              return interfaceHandles.find(handle => this.arc.findStoreById(handle.id)._stored.name == hosted);
            });
          });
        }
        assert.lengthOf(suggestions, 1);
        suggestion = suggestions[0];
      } else if (options.descriptionText) {
        suggestion = this.suggestions.find(p => p.descriptionText == options.descriptionText);
      }
    }
    if (!suggestion) {
      assert.lengthOf(this.suggestions, 1);
      suggestion = this.suggestions[0];
    }
    this.log(`Accepting suggestion: '${((str) => str.length > 50 ? str.substring(0, Math.min(str.length, 50)).concat('...') : str)(suggestion.descriptionText)}'`);
    await this.instantiatePlan(suggestion.plan);
  }

  findSuggestionByParticleNames(particlesNames) {
    return this.suggestions.filter(p => {
      const planParticles = p.plan.particles.map(particle => particle.name);
      return planParticles.length == particlesNames.length && planParticles.every(p => particlesNames.includes(p));
    });
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
    assert.lengthOf(this.suggestions, 1);
    return this.suggestions[0].plan;
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
    await this.arc.idle;
    if (this.slotComposer.expectationsCompleted) {
      await this.slotComposer.expectationsCompleted();
    }
  }

  /** @method verifyData(particleName, connectionName, expectationHandler)
   * Verifies data in handle |connectionName| of |particleName| with the given handler.
   */
  async verifyData(particleName, connectionName, expectationHandler) {
    const particle = this.arc.activeRecipe.particles.find(p => p.name == particleName);
    assert(particle, `Particle ${particle} doesn't exist in active recipe`);
    assert(particle.connections[connectionName], `Connection ${connectionName} doesn't existing in particle ${particleName}`);
    const handleId = particle.connections[connectionName].handle.id;
    assert(handleId, `No handle ID for ${particleName}::${connectionName}`);
    const handle = this.arc.findStoreById(handleId);
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
      assert.lengthOf((await handle.toList()), expectedSetSize, `${particleName}:${connectionName} expected size ${expectedSetSize}`);
    });
  }

  verifySlots(numConsumers, verifyHandler) {
    assert.lengthOf(this.slotComposer.consumers, numConsumers);
    this.slotComposer.consumers.forEach(consumer => verifyHandler(consumer.consumeConn.particle.name, consumer.consumeConn.name, consumer._content));
  }

  // TODO: add more helper methods to verify data and slots.

  log(message) {
    if (this.logging) {
      console.log(message);
    }
  }
}
