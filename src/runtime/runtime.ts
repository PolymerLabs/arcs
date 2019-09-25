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
import {Arc} from './arc.js';
import {RuntimeCacheService} from './runtime-cache.js';
import {Id, IdGenerator} from './id.js';
import {PecFactory} from './particle-execution-context.js';
import {Handle} from './recipe/handle.js';
import {SlotComposer} from './slot-composer.js';
import {Loader} from './loader.js';
import {StorageStub} from './storage-stub.js';
import {StorageProviderBase} from './storage/storage-provider-base.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {ArcInspectorFactory} from './arc-inspector.js';
import {FakeSlotComposer} from './testing/fake-slot-composer.js';
import {VolatileMemory} from './storageNG/drivers/volatile.js';

export type RuntimeArcOptions = Readonly<{
  pecFactories?: PecFactory[];
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
  public readonly context: Manifest;
  private readonly ramDiskMemory: VolatileMemory;
  private readonly arcById = new Map<string, Arc>();

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
    this.ramDiskMemory = new VolatileMemory();
    runtime = this;
    // user information. One persona per runtime for now.
  }

  getCacheService() {
    return this.cacheService;
  }

  getRamDiskMemory(): VolatileMemory {
    return this.ramDiskMemory;
  }

  destroy() {

  }

  newArc(name: string, storageKeyPrefix: string, options?: RuntimeArcOptions): Arc {
    const id = IdGenerator.newSession().newArcId(name);
    const storageKey = storageKeyPrefix + id.toString();
    const slotComposer = this.composerClass ? new this.composerClass() : null;
    return new Arc({id, storageKey, loader: this.loader, slotComposer, context: this.context, ...options});
  }

  // Stuff the shell needs

  /**
   * Given an arc name, return either:
   * (1) the already running arc
   * (2) a deserialized arc (TODO: needs implementation)
   * (3) a newly created arc
   */
  runArc(name: string, storageKeyPrefix: string, options?: RuntimeArcOptions): Arc {
    if (!this.arcById[name]) {
      // TODO: Support deserializing serialized arcs.
      this.arcById[name] = this.newArc(name, storageKeyPrefix, options);
    }
    return this.arcById[name];
  }

  // TODO: This is a temporary method to allow sharing stores with other Arcs.
  registerStore(store: StorageProviderBase, tags: string[]): void {
    if (!this.context.findStoreById(store.id) && tags.includes('shared')) {
      // tslint:disable-next-line: no-any
      this.context['_addStore']((store as any) as StorageStub, tags);
    }
    // TODO: clear stores, when arc is being disposed.
  }

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


