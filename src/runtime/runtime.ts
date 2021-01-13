/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Description} from './description.js';
import {Manifest} from './manifest.js';
import {Arc} from './arc.js';
import {CapabilitiesResolver} from './capabilities-resolver.js';
import {RuntimeCacheService} from './runtime-cache.js';
import {IdGenerator, ArcId, Id} from './id.js';
import {PecFactory} from './particle-execution-context.js';
import {SlotComposer} from './slot-composer.js';
import {ArcInspectorFactory} from './arc-inspector.js';
import {Recipe} from './recipe/lib-recipe.js';
import {RecipeResolver} from './recipe-resolver.js';
import {Loader} from '../platform/loader.js';
import {pecIndustry} from '../platform/pec-industry.js';
import {logsFactory} from '../platform/logs-factory.js';
import {SystemTrace} from '../tracelib/systrace.js';
import {workerPool} from './worker-pool.js';
import {Modality} from './arcs-types/modality.js';
import {StorageKey} from './storage/storage-key.js';
import {StorageKeyFactory} from './storage-key-factory.js';
import {StorageKeyParser} from './storage/storage-key-parser.js';
import {DriverFactory} from './storage/drivers/driver-factory.js';
import {RamDiskStorageDriverProvider} from './storage/drivers/ramdisk.js';
import {SimpleVolatileMemoryProvider, VolatileMemoryProvider, VolatileStorageKey, VolatileStorageKeyFactory} from './storage/drivers/volatile.js';
import {StorageService} from './storage/storage-service.js';
import {DirectStorageEndpointManager} from './storage/direct-storage-endpoint-manager.js';

const {warn} = logsFactory('Runtime', 'orange');

export type RuntimeOptions = Readonly<{
  loader?: Loader;
  pecFactory?: PecFactory;
  memoryProvider?: VolatileMemoryProvider;
  storageService?: StorageService,
  composerClass?: typeof SlotComposer;
  context?: Manifest;
  rootPath?: string,
  urlMap?: {}
}>;

export type RuntimeArcOptions = Readonly<{
  id?: Id;
  pecFactories?: PecFactory[];
  speculative?: boolean;
  innerArc?: boolean;
  stub?: boolean;
  listenerClasses?: ArcInspectorFactory[];
  inspectorFactory?: ArcInspectorFactory;
  storargeKeyFactories?: StorageKeyFactory[];
  modality?: Modality;
}>;


// TODO(sjmiles): weird layering here due to dancing around global state (working on it)
let staticMemoryProvider;
const initDrivers = () => {
  VolatileStorageKey.register();
  staticMemoryProvider = new SimpleVolatileMemoryProvider();
  RamDiskStorageDriverProvider.register(staticMemoryProvider);
};

initDrivers();

const nob = Object.create(null);

@SystemTrace
export class Runtime {
  public context: Manifest;
  public readonly pecFactory: PecFactory;
  public readonly loader: Loader | null;
  private cacheService: RuntimeCacheService;
  private composerClass: typeof SlotComposer | null;
  private memoryProvider: VolatileMemoryProvider;
  readonly storageService: StorageService;
  readonly arcById = new Map<string, Arc>();

  static resetDrivers(noDefault?: true) {
    DriverFactory.providers = new Set();
    StorageKeyParser.reset();
    CapabilitiesResolver.reset();
    if (!noDefault) {
      initDrivers();
    }
  }

  static mapFromRootPath(root: string) {
    // TODO(sjmiles): this is a commonly-used map, but it's not generic enough to live here.
    // Shells that use this default should be provide it to `init` themselves.
    return {
      // important: path to `worker.js`
      'https://$worker/': `${root}/shells/lib/worker/dist/`,
      // these are optional (?)
      'https://$arcs/': `${root}/`,
      'https://$shells': `${root}/shells`,
      'https://$particles/': {
        root,
        path: '/particles/',
        buildDir: '/bazel-bin',
        buildOutputRegex: /\.wasm$/.source
      }
    };
  }

  constructor(opts: RuntimeOptions = {}) {
    const rootMap = opts.rootPath && Runtime.mapFromRootPath(opts.rootPath) || nob;
    const urlMap = opts.urlMap || nob;
    const map = {...rootMap, ...urlMap};
    this.loader = opts.loader || new Loader(map);
    this.pecFactory = opts.pecFactory || pecIndustry(this.loader);
    this.composerClass = opts.composerClass || SlotComposer;
    this.cacheService = new RuntimeCacheService();
    this.memoryProvider = opts.memoryProvider || staticMemoryProvider;
    this.storageService = opts.storageService || new DirectStorageEndpointManager();
    this.context = opts.context || new Manifest({id: 'manifest:default'});
    // user information. One persona per runtime for now.
  }

  getCacheService() {
    return this.cacheService;
  }

  getMemoryProvider(): VolatileMemoryProvider {
    return this.memoryProvider;
  }

  destroy() {
    workerPool.clear();
  }

  // TODO(shans): Clean up once old storage is removed.
  // Note that this incorrectly assumes every storage key can be of the form `prefix` + `arcId`.
  // Should ids be provided to the Arc constructor, or should they be constructed by the Arc?
  // How best to provide default storage to an arc given whatever we decide?
  newArc(name: string, storageKeyPrefix?: ((arcId: ArcId) => StorageKey), options?: RuntimeArcOptions): Arc {
    const id = (options && options.id) || IdGenerator.newSession().newArcId(name);
    const slotComposer = this.composerClass ? new this.composerClass() : null;
    const storageKey = storageKeyPrefix ? storageKeyPrefix(id) : new VolatileStorageKey(id, '');
    const factories = (options && options.storargeKeyFactories) || [new VolatileStorageKeyFactory()];
    const capabilitiesResolver = new CapabilitiesResolver({arcId: id, factories});
    const {loader, context, storageService} = this;
    return new Arc({id, storageKey, capabilitiesResolver, loader, slotComposer, context, storageService, ...options});
  }

  /**
   * Given an arc name, return either:
   * (1) the already running arc
   * (2) a deserialized arc (TODO: needs implementation)
   * (3) a newly created arc
   */
  runArc(name: string, storageKeyPrefix: (arcId: ArcId) => StorageKey, options?: RuntimeArcOptions): Arc {
    if (!this.arcById.has(name)) {
      // TODO: Support deserializing serialized arcs.
      this.arcById.set(name, this.newArc(name, storageKeyPrefix, options));
    }
    return this.arcById.get(name);
  }

  stop(name: string) {
    assert(this.arcById.has(name), `Cannot stop nonexistent arc ${name}`);
    this.arcById.get(name).dispose();
    this.arcById.delete(name);
  }

  findArcByParticleId(particleId: string): Arc {
    return [...this.arcById.values()].find(arc => !!arc.activeRecipe.findParticle(particleId));
  }

  /**
   * Given an arc, returns it's description as a string.
   */
  static async getArcDescription(arc: Arc) : Promise<string> {
    // Verify that it's one of my arcs, and make this non-static, once I have
    // Runtime objects in the calling code.
    return (await Description.create(arc)).getArcDescription();
  }

  async parse(content: string, options?): Promise<Manifest> {
    const {loader, memoryProvider} = this;
    // TODO(sjmiles): this method of generating a manifest id is ad-hoc,
    // maybe should be using one of the id generators, or even better
    // we could eliminate it if the Manifest object takes care of this.
    const id = `in-memory-${Math.floor((Math.random()+1)*1e6)}.manifest`;
    // TODO(sjmiles): this is a virtual manifest, the fileName is invented
    const opts = {id, fileName: `./${id}`, loader, memoryProvider, ...options};
    return Manifest.parse(content, opts);
  }

  async parseFile(path: string, options?): Promise<Manifest> {
    const {memoryProvider} = this;
    const opts = {id: path, memoryProvider, ...options};
    return Manifest.load(path, opts.loader || this.loader, opts);
  }

  // TODO(sjmiles): static methods represent boilerplate.
  // There's no essential reason they are part of Runtime.

  static async resolveRecipe(arc: Arc, recipe: Recipe): Promise<Recipe | null> {
    if (this.normalize(recipe)) {
      if (recipe.isResolved()) {
        return recipe;
      }
      const resolver = new RecipeResolver(arc);
      const plan = await resolver.resolve(recipe);
      if (plan && plan.isResolved()) {
        return plan;
      }
      warn('failed to resolve:\n', (plan || recipe).toString({showUnresolved: true}));
    }
    return null;
  }

  static normalize(recipe: Recipe): boolean {
    if (Runtime.isNormalized(recipe)) {
      return true;
    }
    const errors = new Map();
    if (recipe.normalize({errors})) {
      return true;
    }
    warn('failed to normalize:\n', errors, recipe.toString());
    return false;
  }

  static isNormalized(recipe: Recipe): boolean {
    return Object.isFrozen(recipe);
  }
}
