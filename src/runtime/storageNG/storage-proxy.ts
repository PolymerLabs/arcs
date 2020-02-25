/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {mapStackTrace} from '../../platform/sourcemapped-stacktrace-web.js';
import {PropagatedException, SystemException} from '../arc-exceptions.js';
import {CRDTError, CRDTModel, CRDTOperation, CRDTTypeRecord, VersionMap} from '../crdt/crdt.js';
import {Runnable, Predicate} from '../hot.js';
import {Particle} from '../particle.js';
import {ParticleExecutionContext} from '../particle-execution-context.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {EntityType, Type} from '../type.js';
import {Handle, HandleOptions} from './handle.js';
import {ActiveStore, ProxyMessage, ProxyMessageType, StorageCommunicationEndpoint, StorageCommunicationEndpointProvider} from './store.js';
import {Ttl} from '../recipe/ttl.js';

/**
 * Mediates between one or more Handles and the backing store. The store can be outside the PEC or
 * directly connected to the StorageProxy.
 */
export class StorageProxy<T extends CRDTTypeRecord> {
  private handles: Handle<T>[] = [];
  private crdt: CRDTModel<T>;
  // TODO(shans): remove apiChannelId once we're not constructing StorageProxy objects
  // directly from many places.
  apiChannelId: string;
  private store: StorageCommunicationEndpoint<T>;
  readonly type: Type;
  private listenerAttached = false;
  private keepSynced = false;
  private synchronized = false;
  private readonly scheduler: StorageProxyScheduler<T>;
  private modelHasSynced: Runnable = () => undefined;
  readonly storageKey: string;
  readonly ttl: Ttl;

  constructor(
      apiChannelId: string,
      storeProvider: StorageCommunicationEndpointProvider<T>,
      type: Type,
      storageKey: string,
      ttl = Ttl.infinite) {
    this.apiChannelId = apiChannelId;
    this.store = storeProvider.getStorageEndpoint(this);
    this.crdt = new (type.crdtInstanceConstructor<T>())();
    this.type = type;
    this.storageKey = storageKey;
    this.ttl = ttl;
    this.scheduler = new StorageProxyScheduler<T>();
  }

  async pause() {
    await this.scheduler.pause();
  }

  unpause() {
    this.scheduler.unpause();
  }

  getChannelConstructor(): ChannelConstructor {
    return this.store.getChannelConstructor();
  }

  // TODO: remove this after migration.
  get pec(): ParticleExecutionContext {
    throw new Error('StorageProxyNG does not have a pec.');
  }

  async idle(): Promise<void> {
    return this.scheduler.idle;
  }

  reportExceptionInHost(exception: PropagatedException) {
    // TODO: Encapsulate source-mapping of the stack trace once there are more users of the port.RaiseSystemException() call.
    if (mapStackTrace) {
      mapStackTrace(exception.cause.stack, mappedStack => {
        exception.cause.stack = mappedStack;
        this.store.reportExceptionInHost(exception);
      });
    } else {
      this.store.reportExceptionInHost(exception);
    }
  }

  registerHandle(handle: Handle<T>): void {
    // Attach an event listener to the backing store when the first handle is registered.
    if (!this.listenerAttached) {
      this.store.setCallback(x => this.onMessage(x));
      this.listenerAttached = true;
    }

    if (!handle.canRead) {
      return;
    }
    this.handles.push(handle);


    // Change to synchronized mode as soon as we get any handle configured with keepSynced and send
    // a request to get the full model (once).
    // TODO: drop back to non-sync mode if all handles re-configure to !keepSynced.
    if (handle.options.keepSynced) {
      if (!this.keepSynced) {
        this.requestSynchronization().catch(e => {
          this.reportExceptionInHost(new SystemException(
              e, handle.key, 'StorageProxy::registerHandle'));
        });
        this.keepSynced = true;
      }

      // If a handle configured for sync notifications registers after we've received the full
      // model, notify it immediately.
      if (handle.options.notifySync && this.synchronized) {
        this.notifySyncForHandle(handle);
      }
    }
    return;
  }

  deregisterHandle(handleIn: Handle<T>) {
    this.scheduler.dropMessages(handleIn);
    this.handles = this.handles.filter(handle => handle !== handleIn);
  }

  versionCopy(): VersionMap {
    const version = {};
    for (const [k, v] of Object.entries(this.crdt.getData().version)) {
      version[k] = v;
    }
    return version;
  }

  async applyOp(op: CRDTOperation): Promise<boolean> {
    if (!this.crdt.applyOperation(op)) {
      return false;
    }
    const message: ProxyMessage<T> = {
      type: ProxyMessageType.Operations,
      operations: [op],
    };
    await this.store.onProxyMessage(message);
    this.notifyUpdate(op, options => options.notifyUpdate);
    return true;
  }

  async getParticleView(): Promise<T['consumerType']> {
    if (this.synchronized) {
      return this.getParticleViewAssumingSynchronized();
    } else {
      const promise: Promise<T['consumerType']> =
          new Promise((resolve) => {
            this.modelHasSynced = () => {
              this.modelHasSynced = () => undefined;
              resolve(this.crdt.getParticleView()!);
            };
          });
      // Request a new model, it will come back asynchronously with a ModelUpdate message.
      await this.requestSynchronization();
      return promise;
    }
  }

  getParticleViewAssumingSynchronized(): T['consumerType'] {
    if (!this.synchronized) {
      throw new Error('AssumingSynchronized variant called but proxy is not synchronized');
    }
    return this.crdt.getParticleView()!;
  }

  private setSynchronized(initialModel = null) {
    if (!this.synchronized) {
      this.synchronized = true;
      this.notifySync(initialModel);
    }
  }

  private clearSynchronized() {
    if (this.synchronized) {
      this.synchronized = false;
      this.notifyDesync();
    }
  }

  async onMessage(message: ProxyMessage<T>): Promise<boolean> {
    switch (message.type) {
      case ProxyMessageType.ModelUpdate:
        this.crdt.merge(message.model);
        this.setSynchronized();
        // NOTE: this.modelHasSynced used to run after this.synchronized
        // was set to true but before notifySync() was called. Is that a problem?
        this.modelHasSynced();
        break;
      case ProxyMessageType.Operations: {
        // Immediately notify any handles that are not configured with keepSynced but do want updates.
        message.operations.forEach(
            op => this.notifyUpdate(
                op, options => !options.keepSynced && options.notifyUpdate));
        // Bail if we're not in synchronized mode.
        if (!this.keepSynced) {
          return false;
        }
        const initialModel = this.crdt.getParticleView();
        for (const op of message.operations) {
          if (!this.crdt.applyOperation(op)) {
            // If we cannot cleanly apply ops, sync the whole model.
            this.clearSynchronized();
            return this.requestSynchronization();
          }
          if (!this.synchronized) {
            // If we didn't think we were synchronized but the operation applied cleanly,
            // then actually we were synchronized after all. Tell the handle that.
            this.setSynchronized(initialModel);
          }
          // Notify handles configured with keepSynced.
          this.notifyUpdate(op, options => options.keepSynced && options.notifyUpdate);
        }
        break;
      }
      case ProxyMessageType.SyncRequest:
        await this.store.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: this.crdt.getData()});
        break;
      default:
        throw new CRDTError(
            `Invalid operation provided to onMessage, message: ${message}`);
    }
    return true;
  }

  protected notifyUpdate(operation: CRDTOperation, predicate: Predicate<HandleOptions>) {
    for (const handle of this.handles) {
      if (predicate(handle.options)) {
        this.scheduler.enqueue(
            handle.particle,
            handle,
            {type: HandleMessageType.Update, op: operation});
      }
    }
  }

  protected notifySync(initialModel = null) {
    const model = initialModel ? initialModel : this.crdt.getParticleView();
    for (const handle of this.handles) {
      if (handle.options.notifySync) {
        this.scheduler.enqueue(
            handle.particle, handle, {type: HandleMessageType.Sync, model});
      }
    }
  }

  protected notifySyncForHandle(handle: Handle<T>) {
    const model = this.crdt.getParticleView();
    this.scheduler.enqueue(handle.particle, handle, {type: HandleMessageType.Sync, model});
  }

  protected notifyDesync() {
    for (const handle of this.handles) {
      if (handle.options.notifyDesync) {
        this.scheduler.enqueue(
            handle.particle, handle, {type: HandleMessageType.Desync});
      }
    }
  }

  protected async requestSynchronization(): Promise<boolean> {
    return this.store.onProxyMessage({type: ProxyMessageType.SyncRequest});
  }
}

export class NoOpStorageProxy<T extends CRDTTypeRecord> extends StorageProxy<T> {
  constructor() {
    super(null, {getStorageEndpoint() {}} as ActiveStore<T>, EntityType.make([], {}), null);
  }
  async idle(): Promise<void> {
    return new Promise(resolve => {});
  }

  getChannelConstructor(): ChannelConstructor {
    return null;
  }

  reportExceptionInHost(exception: PropagatedException): void {}

  registerHandle(handle: Handle<T>): VersionMap {
    return {};
  }
  deregisterHandle(handle: Handle<T>): void {}

  versionCopy(): VersionMap {
    return null;
  }

  async applyOp(op: CRDTOperation): Promise<boolean> {
    return new Promise(resolve => {});
  }
  async getParticleView(): Promise<T['consumerType']> {
    return new Promise(resolve => {});
  }

  getParticleViewAssumingSynchronized(): T['consumerType'] {
    return [null, {}];
  }

  async getData(): Promise<T['data']> {
    return new Promise(resolve => {});
  }
  async onMessage(message: ProxyMessage<T>): Promise<boolean> {
    return new Promise(resolve => {});
  }
  protected notifyUpdate(operation: CRDTOperation, predicate: Predicate<HandleOptions>) {}

  protected notifySync() {}

  protected notifySyncForHandle(handle: Handle<T>) {}

  protected notifyDesync() {}

  async pause() {}

  unpause() {}

  protected async requestSynchronization(): Promise<boolean> {
    return new Promise(resolve => {});
  }
}

enum HandleMessageType {
  Sync,
  Desync,
  Update
}

type Event<T extends CRDTTypeRecord> =
  {type: HandleMessageType.Sync, model: T['consumerType']} |
  {type: HandleMessageType.Desync} |
  {type: HandleMessageType.Update, op: T['operation']};

export class StorageProxyScheduler<T extends CRDTTypeRecord> {
  private _scheduled = false;
  private _queues = new Map<Particle, Map<Handle<T>, Event<T>[]>>();
  private _idleResolver: Runnable|null = null;
  private _idle: Promise<void>|null = null;
  private paused = false;
  constructor() {
    this._scheduled = false;
    // Particle -> {Handle -> [Queue of events]}
    this._queues = new Map();
  }

  enqueue(particle: Particle, handle: Handle<T>, args: Event<T>) {
    if (!this._queues.has(particle)) {
      this._queues.set(particle, new Map());
    }
    const byHandle = this._queues.get(particle);
    if (!byHandle.has(handle)) {
      byHandle.set(handle, []);
    }
    const queue = byHandle.get(handle);
    queue.push(args);
    this._schedule();
  }

  get busy(): boolean {
    return this._queues.size > 0;
  }

  _updateIdle(): void {
    if (this._idleResolver && !this.busy) {
      this._idleResolver();
      this._idle = null;
      this._idleResolver = null;
    }
  }

  async pause(): Promise<void> {
    await this.idle;
    this.paused = true;
  }

  unpause(): void {
    this.paused = false;
    this._schedule();
  }

  dropMessages(handle: Handle<T>) {
    for (const byHandle of this._queues.values()) {
      if (byHandle.has(handle)) {
        byHandle.delete(handle);
      }
    }
  }

  get idle(): Promise<void> {
    if (!this.busy) {
      return Promise.resolve();
    }
    if (!this._idle) {
      this._idle = new Promise(resolve => this._idleResolver = resolve);
    }
    return this._idle;
  }

  _schedule(): void {
    if (this._scheduled) {
      return;
    }
    this._scheduled = true;
    setTimeout(() => {
      this._scheduled = false;
      this._dispatch();
    }, 0);
  }

  _dispatch(): void {
    if (this.paused) {
      return;
    }
    // TODO: should we process just one particle per task?
    while (this._queues.size > 0) {
      const particle = [...this._queues.keys()][0];
      const byHandle = this._queues.get(particle);
      this._queues.delete(particle);
      for (const [handle, queue] of byHandle.entries()) {
        for (const update of queue) {
          this._dispatchUpdate(handle, update).catch(e =>
            handle.storageProxy.reportExceptionInHost(new SystemException(
                e, 'StorageProxyScheduler::_dispatch', handle.key)));
        }
      }
    }
    this._updateIdle();
  }

  async _dispatchUpdate(handle: Handle<T>, update: Event<T>): Promise<void> {
    switch (update.type) {
      case HandleMessageType.Sync:
        handle.onSync(update.model);
        break;
      case HandleMessageType.Desync:
        await handle.onDesync();
        break;
      case HandleMessageType.Update:
        handle.onUpdate(update.op);
        break;
      default:
        console.error('Ignoring unknown update', update);
    }
  }
}
