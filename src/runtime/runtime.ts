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
import {CapabilitiesResolver, StorageKeyCreatorsMap} from './capabilities-resolver.js';
import {RuntimeCacheService} from './runtime-cache.js';
import {IdGenerator, ArcId} from './id.js';
import {PecFactory} from './particle-execution-context.js';
import {SlotComposer} from './slot-composer.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {ArcInspectorFactory} from './arc-inspector.js';
import {RamDiskStorageDriverProvider} from './storageNG/drivers/ramdisk.js';
import {SimpleVolatileMemoryProvider, VolatileMemoryProvider, VolatileStorageKey} from './storageNG/drivers/volatile.js';
import {VolatileStorage} from './storage/volatile-storage.js';
import {StorageKey} from './storageNG/storage-key.js';
import {Recipe} from './recipe/recipe.js';
import {RecipeResolver} from './recipe/recipe-resolver.js';
import {Loader} from '../platform/loader.js';
import {pecIndustry} from '../platform/pec-industry.js';
import {logsFactory} from '../platform/logs-factory.js';
import {SystemTrace} from '../tracelib/systrace.js';
import {workerPool} from './worker-pool.js';

const {warn} = logsFactory('Runtime', 'orange');

export type RuntimeOptions = Readonly<{
  loader?: Loader;
  composerClass?: typeof SlotComposer;
  context?: Manifest;
  pecFactory?: PecFactory;
  memoryProvider?: VolatileMemoryProvider;
}>;

export type RuntimeArcOptions = Readonly<{
  pecFactories?: PecFactory[];
  storageProviderFactory?: StorageProviderFactory;
  speculative?: boolean;
  innerArc?: boolean;
  stub?: boolean;
  listenerClasses?: ArcInspectorFactory[];
  inspectorFactory?: ArcInspectorFactory;
  storageKeyCreators?: StorageKeyCreatorsMap;
}>;

type SpawnArgs = {
  id: string,
  serialization?: string,
  context: Manifest,
  composer: SlotComposer,
  storage: string,
  portFactories: [],
  inspectorFactory?: ArcInspectorFactory
};

let runtime: Runtime | null = null;

// To start with, this class will simply hide the runtime classes that are
// currently imported by ArcsLib.js. Once that refactoring is done, we can
// think about what the api should actually look like.
@SystemTrace
export class Runtime {
  public context: Manifest;
  public readonly pecFactory: PecFactory;
  private cacheService: RuntimeCacheService;
  private loader: Loader | null;
  private composerClass: typeof SlotComposer | null;
  private memoryProvider: VolatileMemoryProvider;
  readonly arcById = new Map<string, Arc>();

  /**
   * `Runtime.getRuntime()` returns the most recently constructed Runtime object
   * (or creates one if necessary). Therefore, the most recently created Runtime
   * object represents the default runtime environemnt.
   * Systems can use `Runtime.getRuntime()` to access this environment instead of
   * plumbing `runtime` arguments through numerous functions.
   * Some static methods on this class automatically use the default environment.
   */
  static getRuntime() {
    if (!runtime) {
      runtime = new Runtime();
    }
    return runtime;
  }

  static clearRuntimeForTesting() {
    if (runtime) {
      runtime.destroy();
      runtime = null;
    }
  }

  static newForNodeTesting(context?: Manifest) {
    return new Runtime({context});
  }

  /**
   * Call `init` to establish a default Runtime environment (capturing the return value is optional).
   * Systems can use `Runtime.getRuntime()` to access this environment instead of plumbing `runtime`
   * arguments through numerous functions.
   * Some static methods on this class automatically use the default environment.
   */
  static init(root?: string, urls?: {}): Runtime {
    const map = {...Runtime.mapFromRootPath(root), ...urls};
    const loader = new Loader(map);
    const pecFactory = pecIndustry(loader);
    const memoryProvider = new SimpleVolatileMemoryProvider();
    // TODO(sjmiles): SlotComposer type shenanigans are temporary pending complete replacement
    // of SlotComposer by SlotComposer. Also it's weird that `new Runtime(..., SlotComposer, ...)`
    // doesn't bother tslint at all when done in other modules.
    const runtime = new Runtime({
      loader,
      composerClass: SlotComposer,
      pecFactory,
      memoryProvider
    });
    RamDiskStorageDriverProvider.register(memoryProvider);
    return runtime;
  }

  static mapFromRootPath(root: string) {
    // TODO(sjmiles): this is a commonly-used map, but it's not generic enough to live here.
    // Shells that use this default should be provide it to `init` themselves.
    return {
      // important: path to `worker.js`
      'https://$build/': `${root}/shells/lib/build/`,
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

  constructor({loader, composerClass, context, pecFactory, memoryProvider}: RuntimeOptions = {}) {
    this.cacheService = new RuntimeCacheService();
    // We have to do this here based on a vast swathe of tests that just create
    // a Runtime instance and forge ahead. This is only temporary until we move
    // to the new storage stack.
    VolatileStorage.setStorageCache(this.cacheService);
    this.loader = loader || new Loader();
    this.pecFactory = pecFactory;
    this.composerClass = composerClass || SlotComposer;
    this.context = context || new Manifest({id: 'manifest:default'});
    this.memoryProvider = memoryProvider || new SimpleVolatileMemoryProvider();
    runtime = this;
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

  // Allow dynamic context binding to this runtime.
  bindContext(context: Manifest) {
    this.context = context;
  }

  // TODO(shans): Clean up once old storage is removed.
  // Note that this incorrectly assumes every storage key can be of the form `prefix` + `arcId`.
  // Should ids be provided to the Arc constructor, or should they be constructed by the Arc?
  // How best to provide default storage to an arc given whatever we decide?
  newArc(name: string, storageKeyPrefix: string | ((arcId: ArcId) => StorageKey) | null, options?: RuntimeArcOptions): Arc {
    const {loader, context} = this;
    const id = IdGenerator.newSession().newArcId(name);
    const slotComposer = this.composerClass ? new this.composerClass() : null;
    const capabilitiesResolver = new CapabilitiesResolver({arcId: id}, options ? options.storageKeyCreators : undefined);
    let storageKey : string | StorageKey;
    if (typeof storageKeyPrefix === 'string') {
      storageKey = `${storageKeyPrefix}${id.toString()}`;
    } else if (storageKeyPrefix == null) {
      storageKey = new VolatileStorageKey(id, '');
    } else {
      storageKey = storageKeyPrefix(id);
    }
    return new Arc({id, storageKey, capabilitiesResolver, loader, slotComposer, context, ...options});
  }

  // Stuff the shell needs

  /**
   * Given an arc name, return either:
   * (1) the already running arc
   * (2) a deserialized arc (TODO: needs implementation)
   * (3) a newly created arc
   */
  runArc(name: string, storageKeyPrefix: string | ((arcId: ArcId) => StorageKey), options?: RuntimeArcOptions): Arc {
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

  /**
   * Parse a textual manifest and return a Manifest object. See the Manifest
   * class for the options accepted.
   */
  static async parseManifest(content: string, options?): Promise<Manifest> {
    return Manifest.parse(content, options);
  }

  /**
   * Load and parse a manifest from a resource (not strictly a file) and return
   * a Manifest object. The loader determines the semantics of the fileName. See
   * the Manifest class for details.
   */
  static async loadManifest(fileName, loader, options) : Promise<Manifest> {
    return Manifest.load(fileName, loader, options);
  }

  // TODO(sjmiles): there is redundancy vs `parse/loadManifest` above, but
  // this is temporary until we polish the Utils->Runtime integration.

  // TODO(sjmiles): These methods represent boilerplate factored out of
  // various shells.These needs could be filled other ways or represented
  // by other modules. Suggestions welcome.

  async parse(content: string, options?): Promise<Manifest> {
    const {loader} = this;
    // TODO(sjmiles): this method of generating a manifest id is ad-hoc,
    // maybe should be using one of the id generators, or even better
    // we could eliminate it if the Manifest object takes care of this.
    const id = `in-memory-${Math.floor((Math.random()+1)*1e6)}.manifest`;
    // TODO(sjmiles): this is a virtual manifest, the fileName is invented
    const opts = {id, fileName: `./${id}`, loader, memoryProvider: this.memoryProvider, ...options};
    return Manifest.parse(content, opts);
  }

  async parseFile(path: string, options?): Promise<Manifest> {
    const content = await this.loader.loadResource(path);
    const opts = {id: path, fileName: path, loader: this.loader, memoryProvider: this.memoryProvider, ...options};
    return this.parse(content, opts);
  }

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

  normalize(recipe: Recipe): boolean {
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

  // TODO(sjmiles): redundant vs. newArc, but has some impedance mismatch
  // strategy is to merge first, unify second
  async spawnArc({id, serialization, context, composer, storage, portFactories, inspectorFactory}: SpawnArgs): Promise<Arc> {
    const arcid = IdGenerator.newSession().newArcId(id);
    const storageKey = new VolatileStorageKey(arcid, '');
    const params = {
      id: arcid,
      fileName: './serialized.manifest',
      serialization,
      context,
      storageKey,
      slotComposer: composer,
      pecFactories: [this.pecFactory, ...(portFactories || [])],
      loader: this.loader,
      inspectorFactory,
    };
    return serialization ? Arc.deserialize(params) : new Arc(params);
  }

  // static interface for the default runtime environment

  static async parse(content: string, options?): Promise<Manifest> {
    return this.getRuntime().parse(content, options);
  }

  static async parseFile(path: string, options?): Promise<Manifest> {
    return this.getRuntime().parseFile(path, options);
  }

  static async resolveRecipe(arc: Arc, recipe: Recipe): Promise<Recipe | null> {
    return this.getRuntime().resolveRecipe(arc, recipe);
  }

  static async spawnArc(args: SpawnArgs): Promise<Arc> {
    return this.getRuntime().spawnArc(args);
  }
}
