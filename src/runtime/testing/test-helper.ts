/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {HeadlessSlotDomConsumer} from '../headless-slot-dom-consumer.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {Id} from '../id.js';
import {devtoolsArcInspectorFactory} from '../../devtools-connector/devtools-arc-inspector.js';

export type TestHelperOptions = {
  slotComposerStrict?: boolean,
  slotComposer?: MockSlotComposer,
  logging?: boolean
  loader?: Loader,
  context?: Manifest,
  manifestFilename?: string,
  manifestString?: string,
  storageKey?: string
};

export class TestHelper {
  logging?: boolean;
  loader?: Loader;
  timeout;
  // TODO(lindner): adding the type here causes many compilation errors.
  arc;
  slotComposer: MockSlotComposer;

  static async setupOptions(options: TestHelperOptions): Promise<void> {
    const loader = options.loader || new Loader();
    options.loader = loader;
    if (options.manifestFilename) {
      assert(!options.context, 'context should not be provided if manifestFilename is given');
      options.context = await Manifest.load(options.manifestFilename, loader);
    }
    if (options.manifestString) {
      assert(!options.context, 'context should not be provided if manifestString is given');
      options.context = await TestHelper.parseManifest(options.manifestString, loader);
    }
  }

  static setupHelper(options: TestHelperOptions, helper: TestHelper): void {
    helper.slotComposer = options.slotComposer || new MockSlotComposer({strict: options.slotComposerStrict, logging: options.logging});
    helper.loader = options.loader;
    helper.arc = new Arc({
      id: Id.fromString('demo'),
      slotComposer: helper.slotComposer,
      loader: helper.loader,
      context: options.context,
      storageKey: options.storageKey,
      inspectorFactory: devtoolsArcInspectorFactory
    });
    helper.slotComposer.pec = helper.arc.pec;
    helper.logging = options.logging;
  }

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
  static async create(options: TestHelperOptions = {}): Promise<TestHelper> {
    await TestHelper.setupOptions(options);
    // Explicitly not using a constructor to force using this factory method.
    const helper = new TestHelper();
    TestHelper.setupHelper(options, helper);
    return helper;
  }

  static async parseManifest(manifestString: string, loader) : Promise<Manifest> {
    return await Manifest.parse(manifestString, {loader, fileName: ''});
  }

  setTimeout(timeout: number): void {
    this.timeout = setTimeout(() => this.slotComposer.assertExpectationsCompleted(), timeout);
  }

  clearTimeout(): void {
    clearTimeout(this.timeout);
  }

  get envOptions() {
    return {context: this.arc.context, loader: this.arc.loader};
  }

  /**
   * Sends an event to particle's slot via the slot composer.
   */
  async sendSlotEvent(particleName: string, slotName, event, data) {
    this.log(`Sending event '${event}' to ${particleName}:${slotName}`);

    this.slotComposer.sendEvent(particleName, slotName, event, data);
    await this.idle();
  }

  /**
   * Awaits particle execution context idleness and mock slot composer expectations completeness.
   */
  async idle() {
    await this.arc.idle;
    if (this.slotComposer.expectationsCompleted) {
      await this.slotComposer.expectationsCompleted();
    }
  }

  /**
   * Verifies data in handle |connectionName| of |particleName| with the given handler.
   */
  async verifyData(particleName: string, connectionName: string, expectationHandler) {
    const particle = this.arc.activeRecipe.particles.find(p => p.name === particleName);
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

  /**
   * Verifies the size of data collection in handle |connectionName| of |particleName|.
   */
  async verifySetSize(particleName: string, connectionName: string, expectedSetSize: number) {
    this.log(`Verifying ${particleName}:${connectionName} size is: ${expectedSetSize}`);
    return this.verifyData(particleName, connectionName, async (handle) => {
      assert.lengthOf((await handle.toList()), expectedSetSize, `${particleName}:${connectionName} expected size ${expectedSetSize}`);
    });
  }

  verifySlots(numConsumers: number, verifyHandler) {
    assert.lengthOf(this.slotComposer.consumers, numConsumers);
    for (const consumer of this.slotComposer.consumers as HeadlessSlotDomConsumer[]) {
      verifyHandler(consumer.consumeConn.particle.name, consumer.consumeConn.name, consumer._content);
    }
  }

  // TODO: add more helper methods to verify data and slots.

  log(message) {
    if (this.logging) {
      console.log(message);
    }
  }
}
