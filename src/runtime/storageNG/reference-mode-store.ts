/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes, CRDTSingleton, SingletonOperationSet, SingletonOperationClear} from '../crdt/crdt-singleton.js';
import {CRDTCollectionTypeRecord, Referenceable, CollectionOpTypes, CollectionOperation, CRDTCollection, CollectionOperationAdd, CollectionOperationRemove} from '../crdt/crdt-collection.js';
import {ActiveStore, ProxyCallback, ProxyMessage, ProxyMessageType, StorageMode, StoreConstructorOptions} from './store-interface.js';
import {BackingStore} from './backing-store.js';
import {CRDTEntityTypeRecord, CRDTEntity, EntityData} from '../crdt/crdt-entity.js';
import {DirectStore} from './direct-store.js';
import {StorageKey} from './storage-key.js';
import {CRDTData, VersionMap, CRDTTypeRecord} from '../crdt/crdt.js';
import {Exists} from './drivers/driver-factory.js';
import {Type, CollectionType, ReferenceType} from '../type.js';
import {Producer, Consumer, Runnable, Dictionary} from '../hot.js';
import {PropagatedException} from '../arc-exceptions.js';
import {Store} from './store.js';
import {noAwait} from '../util.js';

// ReferenceMode store uses an expanded notion of Reference that also includes a version. This allows stores to block on
// receiving an update to contained Entities, which keeps remote versions of the store in sync with each other.
export type Reference = {id: string, storageKey: StorageKey, version: VersionMap};
export class ReferenceCollection extends CRDTCollection<Reference> {}
export class ReferenceSingleton extends CRDTSingleton<Reference> {}

export type ReferenceModeOperation<T extends Referenceable> = CRDTSingletonTypeRecord<T>['operation'] | CRDTCollectionTypeRecord<T>['operation'];

enum ReferenceModeUpdateSource {Container, BackingStore, StorageProxy}

type PreEnqueuedMessage<Container extends CRDTTypeRecord, Entity extends CRDTTypeRecord, RefContainer extends CRDTTypeRecord> =
  {from: ReferenceModeUpdateSource.StorageProxy, message: ProxyMessage<Container>} |
  {from: ReferenceModeUpdateSource.BackingStore, message: ProxyMessage<Entity>, muxId: string} |
  {from: ReferenceModeUpdateSource.Container, message: ProxyMessage<RefContainer>};
type EnqueuedMessage<Container extends CRDTTypeRecord, Entity extends CRDTTypeRecord, RefContainer extends CRDTTypeRecord> =
  PreEnqueuedMessage<Container, Entity, RefContainer> & {promise: Consumer<boolean>};

type BlockableRunnable = {fn: Runnable, block?: string};

export class ReferenceModeStorageKey extends StorageKey {
  constructor(public backingKey: StorageKey, public storageKey: StorageKey) {
    super('reference-mode');
  }

  embedKey(key: StorageKey) {
    return key.toString().replace(/\{/g, '{{').replace(/\}/g, '}}');
  }

  toString(): string {
    return `${this.protocol}://{${this.embedKey(this.backingKey)}}{${this.embedKey(this.storageKey)}}`;
  }

  childWithComponent(component: string): StorageKey {
    return new ReferenceModeStorageKey(this.backingKey, this.storageKey.childWithComponent(component));
  }
}

/**
 * ReferenceModeStores adapt between a collection (CRDTCollection or CRDTSingleton) of entities from the perspective of their public API,
 * and a collection of references + a backing store of entity CRDTs from an internal storage perspective.
 *
 * ReferenceModeStores maintain a queue of incoming updates (the receiveQueue) and process them one at a time. When possible, the results
 * of this processing are immediately sent upwards (to connected StorageProxies) and downwards (to storage). However, there are a few
 * caveats:
 * - incoming operations and models from StorageProxies may require several writes to storage - one for each modified entity, and one
 *   to the container store. These are processed serially, so that a container doesn't get updated if backing store modifications fail.
 * - updates from the container store need to be blocked on ensuring the required data is also available in the backing store.
 *   The holdQueue ensures that these blocks are tracked and processed appropriately.
 * - updates should always be sent in order, so a blocked send should block subsequent sends too. The pendingSends queue ensures that all
 *   outgoing updates are sent in the correct order.
 *
 */
export class ReferenceModeStore<Entity extends Referenceable, S extends Dictionary<Referenceable>, C extends Dictionary<Referenceable>,
                                ReferenceContainer extends CRDTSingletonTypeRecord<Reference> | CRDTCollectionTypeRecord<Reference>,
                                Container extends CRDTSingletonTypeRecord<Entity> | CRDTCollectionTypeRecord<Entity>> extends ActiveStore<Container> {

  /*
   * The underlying backing store and container store that this reference view is built from
   */
  backingStore: BackingStore<CRDTEntityTypeRecord<S, C>>;
  containerStore: DirectStore<ReferenceContainer>;

  /*
   * Registered callbacks to Storage Proxies
   */
  private callbacks: Map<number, ProxyCallback<Container>> = new Map();
  private nextCallbackID = 1;

  /*
   * A randomly generated key that is used for synthesized entity CRDT modifications.
   *
   * When entity updates are received by instances of ReferenceModeStore, they're non-CRDT blobs of data.
   * The ReferenceModeStore needs to convert them to tracked CRDTs, which means it needs to synthesize
   * updates. This key is used as the unique write key for those updates.
   */
  private crdtKey = (Math.random() * Math.pow(2, 64)) + '';

  /*
   * The versions dictionary tracks the maximum write version for each entity ID, to ensure synthesized
   * updates can be correctly applied downstream.
   */
  private versions: Dictionary<Dictionary<number>> = {};

  /*
   * A queue of incoming updates from the backing store, container store, and connected proxies.
   * These are dealt with atomically, to avoid transient states where an operation has only been partially
   * processed (e.g. backing written but container update not written).
   */
  private receiveQueue: EnqueuedMessage<Container, CRDTEntityTypeRecord<S, C>, ReferenceContainer>[] = [];

  /*
   * A queue of send Runnables. Some of these may be blocked on entities becoming available in the
   * backing store.
   */
  private pendingSends: BlockableRunnable[] = [];

  /*
   * A queue of blocks to the pendingSends queue.
   */
  private holdQueue: HoldQueue = new HoldQueue();

  /*
   * An incrementing ID to uniquely identify each blocked send.
   */
  private blockCounter = 0;

  static async construct<Entity extends Referenceable, S extends Dictionary<Referenceable>, C extends Dictionary<Referenceable>,
                         ReferenceContainer extends CRDTSingletonTypeRecord<Reference> | CRDTCollectionTypeRecord<Reference>,
                         Container extends CRDTSingletonTypeRecord<Entity> | CRDTCollectionTypeRecord<Entity>>(
      options: StoreConstructorOptions<Container> & {storageKey: ReferenceModeStorageKey}) {
    const result = new ReferenceModeStore<Entity, S, C, ReferenceContainer, Container>(options);
    const {storageKey, type} = options;
    result.backingStore = await BackingStore.construct({
      storageKey: storageKey.backingKey,
      type: type.getContainedType(),
      mode: StorageMode.Backing,
      exists: options.exists,
      baseStore: options.baseStore as unknown as Store<CRDTEntityTypeRecord<S, C>>,
      versionToken: null
    });
    let refType: Type;
    if (type.isCollectionType()) {
      refType = new CollectionType(new ReferenceType(type.getContainedType()));
    } else {
      // TODO(shans) probably need a singleton type here now.
      refType = new ReferenceType(type.getContainedType());
    }
    result.containerStore = await DirectStore.construct({
      storageKey: storageKey.storageKey,
      type,
      mode: StorageMode.Direct,
      exists: options.exists,
      baseStore: options.baseStore as unknown as Store<ReferenceContainer>,
      versionToken: options.versionToken
    });
    result.registerStoreCallbacks();
    return result;
  }

  async serializeContents(): Promise<Container['data']> {
    const data = await this.containerStore.serializeContents();
    const {pendingIds, model} = this.constructPendingIdsAndModel(data);

    if (pendingIds.length === 0) {
      return model();
    }

    return new Promise((resolve, reject) => {
      this.enqueueBlockingSend(pendingIds, () => resolve(model()));
    });
  }

  reportExceptionInHost(exception: PropagatedException): void {
    // TODO(shans): Figure out idle / exception store for reference mode stores.
  }

  // For referenceMode stores, the version tracked is just the version
  // of the container, because any updates to Entities must necessarily be
  // stored as version updates to the references in the container.
  get versionToken() {
    return this.containerStore.versionToken;
  }

  on(callback: ProxyCallback<Container>): number {
    const id = this.nextCallbackID++;
    this.callbacks.set(id, callback);
    return id;
  }
  off(callback: number) {
    this.callbacks.delete(callback);
  }

  private registerStoreCallbacks() {
    this.backingStore.on(this.onBackingStore.bind(this));
    this.containerStore.on(this.onContainerStore.bind(this));
  }

  async getLocalData(): Promise<CRDTData> {
    const {pendingIds, model} = this.constructPendingIdsAndModel(this.containerStore.localModel.getData());
    if (pendingIds.length === 0) {
      return model();
    } else {
      return new Promise(resolve =>
          this.enqueueBlockingSend(pendingIds, () => resolve(model())));
    }
  }

  /**
   * Messages are enqueued onto an object-wide queue and processed in order.
   * Internally, each handler (handleContainerStore, handleBackingStore, handleProxyMessage)
   * should not return until the response relevant to the message has been received.
   *
   * When handling proxy messages, this implies 2 rounds of update - first the backing
   * store needs to be updated, and once that has completed then the container store needs
   * to be updated.
   */
  async onContainerStore(message: ProxyMessage<ReferenceContainer>) {
    return this.enqueue({from: ReferenceModeUpdateSource.Container, message});
  }

  async onBackingStore(message: ProxyMessage<CRDTEntityTypeRecord<S, C>>, muxId: string) {
    return this.enqueue({from: ReferenceModeUpdateSource.BackingStore, message, muxId});
  }

  async onProxyMessage(message: ProxyMessage<Container>): Promise<boolean> {
    return this.enqueue({from: ReferenceModeUpdateSource.StorageProxy, message});
  }

  /**
   * enqueue an incoming update onto the object-wide queue and return a promise that will be resolved
   * when the update is processed.
   */
  private async enqueue(entry: PreEnqueuedMessage<Container, CRDTEntityTypeRecord<S, C>, ReferenceContainer>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const startProcessing = this.receiveQueue.length === 0;
      this.receiveQueue.push({...entry, promise: resolve});
      if (startProcessing) {
        void this.processQueue();
      }
    });
  }

  private async processQueue() {
    while (this.receiveQueue.length > 0) {
      // ths.receiveQueue.length === 0 is used as a signal to start processing (see enqueue). As
      // this method is asynchronous, we can't remove the current element until it's processed
      // or we'll potentially get duplicate calls to processQueue.
      const nextMessage = this.receiveQueue[0];
      switch (nextMessage.from) {
        case ReferenceModeUpdateSource.StorageProxy:
          nextMessage.promise(await this.handleProxyMessage(nextMessage.message));
          break;
        case ReferenceModeUpdateSource.BackingStore:
          nextMessage.promise(await this.handleBackingStore(nextMessage.message, nextMessage.muxId));
          break;
        case ReferenceModeUpdateSource.Container:
          nextMessage.promise(await this.handleContainerStore(nextMessage.message));
          break;
        default:
          throw new Error('invalid message type');
      }
      this.receiveQueue.shift();
    }
  }

  /**
   * Handle an update from the container store.
   *
   * Operations and Models either enqueue an immediate send (if all referenced entities
   * are available in the backing store) or enqueue a blocked send (if some referenced
   * entities are not yet present or are at the incorrect version).
   *
   * Sync requests are propagated upwards to the storage proxy.
   */
  private async handleContainerStore(message: ProxyMessage<ReferenceContainer>) {
    switch (message.type) {
      case ProxyMessageType.Operations: {
        for (const operation of message.operations) {
          const reference = this.operationElement<Reference>(operation);
          let getEntity: () => (Entity | null);

          if (reference) {
            const entityCRDT = this.backingStore.getLocalModel(reference.id);
            if (!entityCRDT) {
              this.enqueueBlockingSend([reference], () => {
                const entityCRDT = this.backingStore.getLocalModel(reference.id);
                const getEntity = () => this.entityFromModel(entityCRDT.getData(), reference.id);
                const upstreamOp = this.updateOp<Reference, Entity>(operation, getEntity);
                void this.send({type: ProxyMessageType.Operations, operations: [upstreamOp]});
              });
              break;
            }
            getEntity = () => this.entityFromModel(entityCRDT.getData(), reference.id);
          } else {
            getEntity = () => null;
          }

          this.enqueueSend(() => {
            const upstreamOp = this.updateOp<Reference, Entity>(operation, getEntity);
            void this.send({type: ProxyMessageType.Operations, operations: [upstreamOp]});
          });
        }
        break;
      }
      case ProxyMessageType.ModelUpdate: {
        const data = message.model;
        const {pendingIds, model} = this.constructPendingIdsAndModel(data);

        const send = () => void this.send({type: ProxyMessageType.ModelUpdate, model: model()});

        if (pendingIds.length === 0) {
          this.enqueueSend(send);
        } else {
          this.enqueueBlockingSend(pendingIds, send);
        }
        break;
      }
      case ProxyMessageType.SyncRequest: {
        this.enqueueSend(() => {
          void this.send({type: ProxyMessageType.SyncRequest});
        });
        break;
      }
      default: {
        throw new Error('Unexpected ProxyMessageType');
      }
    }
    return true;
  }

  /**
   * Handle an update from the backing store.
   *
   * Model and Operation updates are routed directly to the holdQueue, where they may unblock
   * pending sends but will not have any other action.
   *
   * Syncs should never occur as operation/model updates to the backing store are generated
   * by this ReferenceModeStore object and hence should never be out-of-order.
   */
  private async handleBackingStore(message: ProxyMessage<CRDTEntityTypeRecord<S, C>>, muxId: string) {
    switch (message.type) {
      case ProxyMessageType.ModelUpdate:
        this.holdQueue.processID(muxId, message.model.version);
        break;
      case ProxyMessageType.Operations:
        this.holdQueue.processID(muxId, message.operations[message.operations.length - 1].clock);
        break;
      case ProxyMessageType.SyncRequest:
        throw new Error('Unexpected SyncRequest from backing store');
      default:
        throw new Error('Unexpected ProxyMessageType');
    }
    return true;
  }

  /**
   * Handle an update from an upstream StorageProxy.
   *
   * Model and Operation updates apply first to the backing store, then to the container store.
   * Backing store updates should never fail as updates are locally generated.
   * For Operations:
   * - If the container store update succeeds, then the update is mirrored to non-sending StorageProxies.
   * - If the container store update fails, then a `false` return value ensures that the upstream proxy
   *   will request a sync.
   * Model updates should not fail.
   *
   * Sync requests are handled by directly constructing and sending a model
   */
  private async handleProxyMessage(message: ProxyMessage<Container>): Promise<boolean> {
    switch (message.type) {
      case ProxyMessageType.Operations: {
        const operations = message.operations;
        for (const operation of operations) {
          const entity = this.operationElement<Entity>(operation);
          let reference: Reference = null;
          if (entity) {
            await this.updateBackingStore(entity);
            const version = this.backingStore.getLocalModel(entity.id).getData().version;
            reference = {id: entity.id, storageKey: this.backingStore.storageKey, version};
          }
          const containerMessage = this.updateOp<Entity, Reference>(operation, () => reference);
          const response = await this.containerStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [containerMessage], id: 1});
          if (response) {
            this.enqueueSend(() => void this.sendExcept(message, message.id));
          } else {
            return false;
          }
        }
        break;
      }
      case ProxyMessageType.ModelUpdate: {
        const {version, values} = message.model;
        const newValues = {} as Dictionary<{value: Reference, version: VersionMap}>;
        const backingStoreReceipts: Promise<boolean>[] = [];
        Object.entries(values).forEach(([id, {value, version}]) => {
          backingStoreReceipts.push(this.updateBackingStore(value).then(success => {
            if (success) {
              const entityVersion = this.backingStore.getLocalModel(id).getData().version;
              newValues[id] = {value: {id, storageKey: this.backingStore.storageKey, version: entityVersion}, version};
            }
            return success;
          }));
        });
        await Promise.all(backingStoreReceipts);
        const model = {version, values: newValues};
        await this.containerStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model, id: 1});
        this.enqueueSend(() => this.sendExcept(message, message.id));
        break;
      }
      case ProxyMessageType.SyncRequest: {
        const {pendingIds, model} = this.constructPendingIdsAndModel(this.containerStore.localModel.getData());
        const send = () => void this.callbacks.get(message.id)({type: ProxyMessageType.ModelUpdate, model: model(), id: message.id});
        if (pendingIds.length === 0) {
          this.enqueueSend(send);
        } else {
          this.enqueueBlockingSend(pendingIds, send);
        }

        break;
      }
      default:
        throw new Error('Unexpected ProxyMessageType');
    }
    return true;
  }

  /**
   * Enqueues a sending function on the send queue. If the send queue is empty then
   * the function is immediately invoked.
   */
  private enqueueSend(runnable: Runnable) {
    if (this.pendingSends.length === 0) {
      runnable();
    } else {
      this.pendingSends.push({fn: runnable});
    }
  }

  /**
   * Enqueues a send function on the send queue, deferring execution until the
   * provided id list is available in the backing store.
   */
  private enqueueBlockingSend(entities: {id: string, version: VersionMap}[], runnable: Runnable) {
    const block = (this.blockCounter++) + '';
    this.pendingSends.push({fn: runnable, block});
    this.holdQueue.enqueue(entities, () => this.processPendingSends(block));
  }

  /**
   * Process any sends in the pending send queue, including sends blocked on the
   * provided block. This should only be called by the holdQueue.
   */
  private processPendingSends(block: string) {
    while (this.pendingSends.length > 0) {
      if (this.pendingSends[0].block == null || this.pendingSends[0].block === block) {
        const send = this.pendingSends.shift();
        send.fn();
      }
    }
  }

  /**
   * Convert the provided entity to a CRDT Model of the entity. This requires synthesizing
   * a version map for the CRDT model, which is also provided as an output.
   */
  private entityToModel(entity: Entity): EntityData<S, C> {
    if (this.versions[entity.id] == undefined) {
      this.versions[entity.id] = {};
    }
    const entityVersion = this.versions[entity.id];
    const model = this.newBackingInstance().getData();
    let maxVersion = 0;
    for (const key of Object.keys(entity)) {
      if (key === 'id') {
        continue;
      }
      if (entityVersion[key] == undefined) {
        entityVersion[key] = 0;
      }
      const version = {[this.crdtKey]: ++entityVersion[key]};
      maxVersion = Math.max(maxVersion, entityVersion[key]);
      if (model.singletons[key]) {
        model.singletons[key].values = {[entity[key].id]: {value: entity[key], version}};
        model.singletons[key].version = version;
      } else if (model.collections[key]) {
        model.collections[key].values = {};
        for (const value of entity[key]) {
          model.collections[key].values[value.id] = {value, version};
        }
        model.collections[key].version = version;
      } else  {
        throw new Error(`key ${key} not found for model ${model}`);
      }
    }
    model.version = {[this.crdtKey]: maxVersion};
    return model;
  }

  /**
   * Convert the provided CRDT model into an entity.
   */
  private entityFromModel(model: EntityData<S, C>, id: string): Entity {
    const entity = {id} as Entity;
    const singletons = {};
    for (const field of Object.keys(model.singletons)) {
      singletons[field] = new CRDTSingleton();
    }
    const collections = {};
    for (const field of Object.keys(model.collections)) {
      collections[field] = new CRDTCollection();
    }
    const entityCRDT = new CRDTEntity(singletons, collections);
    entityCRDT.merge(model);
    const data = entityCRDT.getParticleView();
    for (const [key, value] of Object.entries(data.singletons)) {
      entity[key] = value;
    }
    for (const [key, value] of Object.entries(data.collections)) {
      entity[key] = value;
    }
    return entity;
  }

  private cloneMap<V>(map: Dictionary<V>) {
    const result: Dictionary<V> = {};
    Object.entries(map).forEach(([key, value]) => result[key] = value);
    return result;
  }

  /**
   * Returns a function that can construct a CRDTModel of a Container of Entities based off the
   * provided Container of References. Any referenced IDs that are not yet available in the backing
   * store are returned in the pendingIds list. The returned function should not be invoked until
   * all references in pendingIds have valid backing in the backing store.
   */
  private constructPendingIdsAndModel(data: ReferenceContainer['data']): {pendingIds: {id: string, version: VersionMap}[], model: Producer<Container['data']>} {
    const pendingIds: {id: string, version: VersionMap}[] = [];
    for (const id of Object.keys(data.values)) {
      const version = data.values[id].value.version;
      if (Object.keys(version).length === 0) {
        // This object is requested at an empty version, which means that it's new and can be directly constructed
        // rather than waiting for an update.
        continue;
      }
      const backingModel = this.backingStore.getLocalModel(id);
      if ((backingModel == null) || !versionIsLarger(backingModel.getData().version, version)) {
        pendingIds.push({id, version});
      }
    }

    const fn = () => {
      const model = {values: {}, version: this.cloneMap(data.version)} as Container['data'];
      for (const id of Object.keys(data.values)) {
        const version = data.values[id].value.version;
        const entity = Object.keys(version).length === 0 ? this.newBackingInstance() : this.backingStore.getLocalModel(id);
        model.values[id] = {value: this.entityFromModel(entity.getData(), id), version: data.values[id].version};
      }
      return model;
    };
    return {pendingIds, model: fn};
  }

  /**
   * Add appropriate ids and send the provided message on all registered StorageProxy callbacks.
   */
  private async send(message: Partial<ProxyMessage<Container>>) {
    for (const key of this.callbacks.keys()) {
      noAwait(this.callbacks.get(key)({...message, id: key} as ProxyMessage<Container>));
    }
  }

  /**
   * Add appropriate ids and send the provided message on all registered StorageProxy callbacks,
   * except for the callback identified by the provided callback ID.
   */
  private async sendExcept(message: Partial<ProxyMessage<Container>>, notTo: number) {
    for (const key of this.callbacks.keys()) {
      if (key === notTo) {
        continue;
      }
      noAwait(this.callbacks.get(key)({...message, id: key} as ProxyMessage<Container>));
    }
  }

  /**
   * Write the provided entity to the backing store.
   */
  private async updateBackingStore(entity: Entity) {
    const model = this.entityToModel(entity);
    return this.backingStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model, id: 1}, entity.id);
  }

  private newBackingInstance() {
    const instanceConstructor = this.type.getContainedType().crdtInstanceConstructor<CRDTEntityTypeRecord<S, C>>();
    return new instanceConstructor();
  }

  /**
   * Apply the an add, remove, set or clear method to the provided operation
   * based on the operation type.
   */
  private processOp<T extends Referenceable, U>(
      onAdd: (op: CollectionOperationAdd<T>) => U,
      onRemove: (op: CollectionOperationRemove<T>) => U,
      onSet: (op: SingletonOperationSet<T>) => U,
      onClear: (op: SingletonOperationClear) => U,
      operation: ReferenceModeOperation<T>): U {
    if (isCollectionOperation<T>(operation)) {
      switch (operation.type) {
        case CollectionOpTypes.Add:
          return onAdd(operation);
        case CollectionOpTypes.Remove:
          return onRemove(operation);
        default:
          throw new Error('unexpected operation type');
      }
    } else if (isSingletonOperation<T>(operation)) {
      switch (operation.type) {
        case SingletonOpTypes.Set:
          return onSet(operation);
        case SingletonOpTypes.Clear:
          return onClear(operation);
        default:
          throw new Error('unexpected operation type');
      }
    }
    throw new Error('unexpected operation type');
  }

  /**
   * Return the element referenced by the provided operation, or null if the operation is a clear operation.
   */
  private operationElement<T extends Referenceable>(operation: ReferenceModeOperation<T>): T | null {
    return this.processOp(addOp => addOp.added, removeOp => removeOp.removed, setOp => setOp.value, clearOp => null, operation);
  }

  /**
   * Update the provided operation's element using the provided producer.
   */
  private updateOp<T extends Referenceable, U extends Referenceable>(operation: ReferenceModeOperation<T>, getValue: Producer<U>): ReferenceModeOperation<U> {
    const add: (op: CollectionOperationAdd<T>) => ReferenceModeOperation<U> = addOp => ({...addOp, added: getValue()});
    const remove: (op: CollectionOperationRemove<T>) => ReferenceModeOperation<U> = removeOp => ({...removeOp, removed: getValue()});
    const set: (op: SingletonOperationSet<T>) => ReferenceModeOperation<U> = setOp => ({...setOp, value: getValue()});
    const clear: (op: SingletonOperationClear) => ReferenceModeOperation<U> = clearOp => clearOp;
    return this.processOp<T, ReferenceModeOperation<U>>(add, remove, set, clear, operation);
  }
}

type HoldRecord = {
  ids: Dictionary<VersionMap>,
  onRelease: Runnable
};

function versionIsLarger(larger: VersionMap, smaller: VersionMap) {
  for (const key in Object.keys(smaller)) {
    if (larger[key] < smaller[key]) {
      return false;
    }
  }
  return true;
}

class HoldQueue {
  queue: Dictionary<HoldRecord[]> = {};

  enqueue(entities: {id: string, version: VersionMap}[], onRelease: Runnable) {
    const ids = {};
    for (const {id, version} of entities) {
      ids[id] = version;
    }
    const holdRecord = {ids, onRelease};
    for (const entity of entities) {
      if (!this.queue[entity.id]) {
        this.queue[entity.id] = [];
      }
      this.queue[entity.id].push(holdRecord);
    }
  }

  processID(id: string, version: VersionMap) {
    const records = this.queue[id];
    if (!records) {
      return;
    }
    for (const record of records) {
      if (versionIsLarger(version, record.ids[id])) {
        delete record.ids[id];
        if (Object.keys(record.ids).length === 0) {
          record.onRelease();
        }
      }
    }
    this.queue[id] = [];
  }
}

function isCollectionOperation<T>(operation: CollectionOperation<T> | SingletonOperation<T>): operation is CollectionOperation<T> {
  return Boolean(operation['added'] || operation['removed']);
}

function isSingletonOperation<T>(operation: CollectionOperation<T> | SingletonOperation<T>): operation is SingletonOperation<T> {
  return !isCollectionOperation(operation);
}

