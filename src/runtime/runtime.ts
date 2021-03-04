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
import {ArcOptions, Arc} from './arc.js';
import {RuntimeCacheService} from './runtime-cache.js';
import {IdGenerator, ArcId, Id} from './id.js';
import {PecFactory} from './particle-execution-context.js';
import {SlotComposer} from './slot-composer.js';
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
import {SimpleVolatileMemoryProvider, VolatileMemoryProvider, VolatileStorageKey} from './storage/drivers/volatile.js';
import {CapabilitiesResolver} from './capabilities-resolver.js';
import {StorageService} from './storage/storage-service.js';
import {DirectStorageEndpointManager} from './storage/direct-storage-endpoint-manager.js';
import {Dictionary} from '../utils/lib-utils.js';
import {SingletonAllocator, Allocator} from './allocator.js';
import {StorageKeyPrefixer, NewArcOptions} from './arc-info.js';
import {ArcHostImpl, ArcHost} from './arc-host.js';

const {warn} = logsFactory('Runtime', 'orange');

export type RuntimeOptions = Readonly<{
  loader?: Loader;
  pecFactory?: PecFactory;
  memoryProvider?: VolatileMemoryProvider;
  driverFactory?: DriverFactory;
  storageKeyFactories?: StorageKeyFactory[];
  storageService?: StorageService,
  composerClass?: typeof SlotComposer;
  context?: Manifest;
  rootPath?: string,
  urlMap?: {},
  staticMap?: {}
}>;

const nob = Object.create(null);

@SystemTrace
export class Runtime {

  // TODO(sjmiles): static methods represent boilerplate.
  // There's no essential reason they are part of Runtime.
  // Consider.

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

  /**
   * Given an arc, returns it's description as a string.
   */
  async getArcDescription(arc: Arc) : Promise<string> {
    // Verify that it's one of my arcs, and make this non-static, once I have
    // Runtime objects in the calling code.
    return (await Description.create(arc)).getArcDescription();
  }

  // TODO(mmandlis): move into allocator!
  async resolveRecipe(arc: Arc, recipe: Recipe): Promise<Recipe | null> {
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

  private normalize(recipe: Recipe): boolean {
    if (this.isNormalized(recipe)) {
      return true;
    }
    const errors = new Map();
    if (recipe.normalize({errors})) {
      return true;
    }
    warn('failed to normalize:\n', errors, recipe.toString());
    return false;
  }

  private isNormalized(recipe: Recipe): boolean {
    return Object.isFrozen(recipe);
  }

  // non-static members

  public context: Manifest;
  public readonly pecFactory: PecFactory;
  public readonly loader: Loader | null;
  private cacheService: RuntimeCacheService;
  /*private*/public composerClass: typeof SlotComposer | null;
  public memoryProvider: VolatileMemoryProvider;
  public readonly storageService: StorageService;
  public get arcById() {
    return (this.host as ArcHostImpl).arcById; // TODO: get rid of this!
  }
  public readonly allocator: Allocator;
  public readonly host: ArcHost;
  public driverFactory: DriverFactory;
  public storageKeyParser: StorageKeyParser;
  public storageKeyFactories: Dictionary<StorageKeyFactory> = {};

  constructor(opts: RuntimeOptions = {}) {
    const customMap = opts.urlMap || nob;
    const rootMap = opts.rootPath && Runtime.mapFromRootPath(opts.rootPath) || nob;
    this.loader = opts.loader || new Loader({...rootMap, ...customMap}, opts.staticMap);
    this.pecFactory = opts.pecFactory || pecIndustry(this.loader);
    this.composerClass = opts.composerClass || SlotComposer;
    this.cacheService = new RuntimeCacheService();
    this.memoryProvider = opts.memoryProvider || new SimpleVolatileMemoryProvider();
    this.driverFactory = opts.driverFactory || new DriverFactory();
    this.storageKeyParser = new StorageKeyParser();
    this.storageService = opts.storageService || new DirectStorageEndpointManager(this.driverFactory, this.storageKeyParser);
    this.context = opts.context || new Manifest({id: 'manifest:default'});
    VolatileStorageKey.register(this);
    RamDiskStorageDriverProvider.register(this);
    for (const factory of opts.storageKeyFactories || []) {
      this.registerStorageKeyFactory(factory);
    }
    this.host = new ArcHostImpl('defaultHost', this);
    this.allocator = new SingletonAllocator(this, this.host);
    // user information. One persona per runtime for now.
  }

  registerStorageKeyFactory(factory: StorageKeyFactory) {
    this.storageKeyFactories[factory.protocol] = factory;
  }

  getCapabilitiesResolver(arcId: ArcId, factories?: StorageKeyFactory[]) {
    return new CapabilitiesResolver({
      arcId,
      factories: [...Object.values(this.storageKeyFactories), ...(factories || [])]
    });
  }

  destroy() {
    workerPool.clear();
  }

  getCacheService() {
    return this.cacheService;
  }

  getMemoryProvider(): VolatileMemoryProvider {
    return this.memoryProvider;
  }

  // TODO(shans): Clean up once old storage is removed.
  // Note that this incorrectly assumes every storage key can be of the form `prefix` + `arcId`.
  // Should ids be provided to the Arc constructor, or should they be constructed by the Arc?
  // How best to provide default storage to an arc given whatever we decide?

  /**
   * Given an arc name, return either:
   * (1) the already running arc
   * (2) a deserialized arc (TODO: needs implementation)
   * (3) a newly created arc
   */
  async startArc(options: NewArcOptions & {planName?: string}): Promise<Arc> {
    const arcId = await this.allocator.startArcWithPlan(options);
    return this.host.getArcById(arcId);
  }

  newArc(options?: NewArcOptions): Arc {
    const arcId = this.allocator.startArc(options);
    assert(this.host.getArcById(arcId));
    return this.host.getArcById(arcId);
  }

  stop(name: string) {
    this.allocator.stopArc(ArcId.fromString(name));
  }

  findArcByParticleId(particleId: string): Arc {
    return [...this.arcById.values()].find(arc => !!arc.activeRecipe.findParticle(particleId));
  }

  async parse(content: string, options?): Promise<Manifest> {
    const {loader, memoryProvider, storageKeyParser} = this;
    // TODO(sjmiles): this method of generating a manifest id is ad-hoc,
    // maybe should be using one of the id generators, or even better
    // we could evacipate it if the Manifest object takes responsibility.
    const id = `in-memory-${Math.floor((Math.random()+1)*1e6)}.manifest`;
    // TODO(sjmiles): this is a virtual manifest, the fileName is invented
    const opts = {id, fileName: `./${id}`, loader, memoryProvider, storageKeyParser, ...options};
    return Manifest.parse(content, opts);
  }

  async parseFile(path: string, options?): Promise<Manifest> {
    const {memoryProvider, storageKeyParser} = this;
    const opts = {id: path, memoryProvider, storageKeyParser, ...options};
    return Manifest.load(path, opts.loader || this.loader, opts);
  }
}
