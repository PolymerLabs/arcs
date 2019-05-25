/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Description} from './description.js';
import {Manifest} from './manifest.js';
import {Arc, ArcOptions} from './arc.js';
import {RuntimeCacheService} from './runtime-cache.js';
import {Id, IdGenerator} from './id.js';
import {PecFactory} from './particle-execution-context.js';
import {SlotComposer} from './slot-composer.js';
import {Loader} from './loader.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {ArcInspectorFactory} from './arc-inspector.js';
import {assert} from '../platform/assert-web.js';
import {FakeSlotComposer} from './testing/fake-slot-composer.js';
import {VolatileMemory} from './storageNG/drivers/volatile.js';

export type RuntimeArcOptions = Readonly<{
  pecFactory?: PecFactory;
  storageProviderFactory?: StorageProviderFactory;
  speculative?: boolean;
  innerArc?: boolean;
  stub?: boolean;
  listenerClasses?: ArcInspectorFactory[];
  inspectorFactory?: ArcInspectorFactory;
}>;

// To start with, this class will simply hide the runtime classes that are
// currently imported by ArcsLib.js. Once that refactoring is done, we can
// think about what the api should actually look like.
export class Runtime {
  private cacheService: RuntimeCacheService;
  private loader: Loader | null;
  private composerClass: new () => SlotComposer | null;
  private context: Manifest;
  private readonly volatileMemory: VolatileMemory;

  static getRuntime() {
    if (runtime == null) {
      runtime = new Runtime();
    }
    return runtime;
  }

  static clearRuntimeForTesting() {
    if (runtime !== null) {
      runtime.destroy();
      runtime = null;
    }
  }

  static newForNodeTesting(context?: Manifest) {
    return new Runtime(new Loader(), FakeSlotComposer, context);
  }

  constructor(loader?: Loader, composerClass?: new () => SlotComposer, context?: Manifest) {
    this.cacheService = new RuntimeCacheService();
    this.loader = loader;
    this.composerClass = composerClass;
    this.context = context || new Manifest({id: 'manifest:default'});
    this.volatileMemory = new VolatileMemory();
    // user information. One persona per runtime for now.
  }

  getCacheService() {
    return this.cacheService;
  }

  getVolatileMemory(): VolatileMemory {
    return this.volatileMemory;
  }

  destroy() {

  }

  newArc(name: string, storageKeyPrefix: string, options?: RuntimeArcOptions) {
    const id = IdGenerator.newSession().newArcId(name);
    const storageKey = storageKeyPrefix + id.toString();
    return new Arc({id, storageKey, loader: this.loader, slotComposer: new this.composerClass(), context: this.context, ...options});
  }

  // Stuff the shell needs

  /**
   * Given an arc, returns it's description as a string.
   */
  static async getArcDescription(arc: Arc) : Promise<string> {
    // Verify that it's one of my arcs, and make this non-static, once I have
    // Runtime objects in the calling code.
    return (await Description.create(arc)).getArcDescription();
  }

  /**
   * Parse a textual manifest and return a Manifest object. See the Manifest
   * class for the options accepted.
   */
  static async parseManifest(content: string, options?): Promise<Manifest> {
    return Manifest.parse(content, options);
  }

  /**
   * Load and parse a manifest from a resource (not striclty a file) and return
   * a Manifest object. The loader determines the semantics of the fileName. See
   * the Manifest class for details.
   */
  static async loadManifest(fileName, loader, options) : Promise<Manifest> {
    return Manifest.load(fileName, loader, options);
  }

  // stuff the strategizer needs

}

let runtime: Runtime = null;


