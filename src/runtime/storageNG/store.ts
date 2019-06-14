/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTModel, CRDTTypeRecord, CRDTChange, ChangeType, CRDTError} from '../crdt/crdt.js';
import {Type} from '../type.js';
import {Exists, Driver, DriverFactory} from './drivers/driver-factory.js';
import {StorageKey} from './storage-key.js';

export enum StorageMode {Direct, Backing, ReferenceMode}

export enum ProxyMessageType { SyncRequest, ModelUpdate, Operations }

export type ProxyMessage<T extends CRDTTypeRecord> = {type: ProxyMessageType.SyncRequest, id: number} | 
  {type: ProxyMessageType.ModelUpdate, model: T['data'], id: number} |
  {type: ProxyMessageType.Operations, operations: T['operation'][], id: number}; 

export type ProxyCallback<T extends CRDTTypeRecord> = (message: ProxyMessage<T>) => Promise<boolean>;

// A representation of a store. Note that initially a constructed store will be
// inactive - it will not connect to a driver, will not accept connections from 
// StorageProxy objects, and no data will be read or written.
//
// Calling 'activate() will generate an interactive store and return it. 
export class Store<T extends CRDTTypeRecord> {
  readonly storageKey: StorageKey;
  exists: Exists;
  readonly type: Type;
  readonly mode: StorageMode;

  readonly constructors = new Map([[StorageMode.Direct, DirectStore],
                                   [StorageMode.Backing, null],
                                   [StorageMode.ReferenceMode, null]]);
  modelConstructor: new () => CRDTModel<T>;

  constructor(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    this.storageKey = storageKey;
    this.exists = exists;
    this.type = type;
    this.mode = mode;
    this.modelConstructor = modelConstructor;
  }
  async activate(): Promise<ActiveStore<T>> {
    if (this.constructors.get(this.mode) == null) {
      throw new Error(`StorageMode ${this.mode} not yet implemented`);
    }
    const activeStore = await this.constructors.get(this.mode).construct<T>(this.storageKey, this.exists, this.type, this.mode, this.modelConstructor);
    this.exists = Exists.ShouldExist;
    return activeStore;
  }
}

// A representation of an active store. Subclasses of this class provide specific
// behaviour as controlled by the provided StorageMode.
export abstract class ActiveStore<T extends CRDTTypeRecord> extends Store<T> {
  
  async awaitFlushed() {
    return Promise.resolve();
  }

  abstract on(callback: ProxyCallback<T>): number;
  abstract off(callback: number): void;
  abstract async onProxyMessage(message: ProxyMessage<T>): Promise<boolean>;
}

export class DirectStore<T extends CRDTTypeRecord> extends ActiveStore<T> {
  localModel: CRDTModel<T>;
  callbacks = new Map<number, ProxyCallback<T>>();
  driver: Driver<T['data']>;
  inSync = true;
  private nextCallbackID = 1;
  private version = 0;
  private pendingException: Error | null = null;
  private sendsInFlight = 0;
  private pendingResolves: Function[] = [];
  private pendingRejects: Function[] = [];
  private pendingSends = [];


  /* 
   * This class should only ever be constructed via the static construct method
   */
  private constructor(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    super(storageKey, exists, type, mode, modelConstructor);
  }

  async awaitFlushed() {
    console.log('awaitFlushed!!!', this.exists ? 'L' : 'R', this.pendingException, this.sendsInFlight, this.inSync);
    if (this.pendingException) {
      return Promise.reject(this.pendingException);
    }
    if (this.sendsInFlight === 0 && this.inSync) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.pendingResolves.push(resolve);
      this.pendingRejects.push(reject);
    });
  }

  private notifyIdle() {
    if (this.pendingException) {
      this.pendingRejects.forEach(reject => reject(this.pendingException));
    } else {
      this.pendingResolves.forEach(resolve => resolve());
      this.pendingResolves = [];
    }
  }

  static async construct<T extends CRDTTypeRecord>(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    const me = new DirectStore<T>(storageKey, exists, type, mode, modelConstructor);
    me.localModel = new modelConstructor();
    me.driver = await DriverFactory.driverInstance(storageKey, exists);
    if (me.driver == null) {
      throw new CRDTError(`No driver exists to support storage key ${storageKey}`);
    }
    me.driver.registerReceiver(me.onReceive.bind(me));
    return me;
  }
  // The driver will invoke this method when it has an updated remote model
  async onReceive(model: T['data'], version: number): Promise<void> {
    try {
      const {modelChange, otherChange} = this.localModel.merge(model);
      await this.processModelChange(modelChange, otherChange, version, true);
    } catch (e) {
      this.pendingException = e;
      this.notifyIdle();
    }
  }
  
  private async processModelChange(thisChange: CRDTChange<T>, otherChange: CRDTChange<T>, version: number, messageFromDriver: boolean) {
    console.log('processModelChange', this.exists ? 'L' : 'R', thisChange, otherChange, 'derived from:', version, messageFromDriver ? 'from driver' : 'from proxy');
    if (thisChange.changeType === ChangeType.Operations && thisChange.operations.length > 0) {
      this.callbacks.forEach((cb, id) => cb({type: ProxyMessageType.Operations, operations: thisChange.operations, id}));
    } else if (thisChange.changeType === ChangeType.Model) {
      this.callbacks.forEach((cb, id) => cb({type: ProxyMessageType.ModelUpdate, model: thisChange.modelPostChange, id}));
    }
       
    // Don't send to the driver if we're already in sync and there are no driver-side changes.
    if (this.noDriverSideChanges(thisChange, otherChange, messageFromDriver)) {
      // Need to record the driver version so that we can continue to send.
      this.version = version;
      return;
    }

    this.version = version + 1;
    this.inSync = false;
    const theVersion = this.version;
    console.log('->', this.exists ? 'L' : 'R', 'version:', theVersion);
    this.sendsInFlight++;
    this.inSync = await this.enqueueSend(this.localModel.getData(), this.version);
    this.sendsInFlight--;
    console.log('amIFlushed?', this.exists ? 'L' : 'R', this.sendsInFlight, this.inSync);
    if (this.sendsInFlight === 0 && this.inSync) {
      this.notifyIdle();
    }
    console.log('<-', this.exists ? 'L' : 'R', 'version:', theVersion, this.inSync);
  }

  private async enqueueSend(data: T["data"], version: number) {
    let resolver: Function;
    const deferredSend = new Promise((resolve, reject) => {
      resolver = resolve;
    }).then(async () => {
      return await this.driver.send(data, version);
    });
    this.pendingSends.push({resolver, promise: deferredSend});
    if (this.pendingSends.length === 1) {
      this.startSending();
    }
    return deferredSend;
  }

  private async startSending() {
    console.log('startSending scheduling 1 send');
    this.pendingSends[0].resolver(false);
    await this.pendingSends[0].promise;
    console.log('startSending one send achieved');
    this.pendingSends = this.pendingSends.slice(1);
    if (this.pendingSends.length > 0) {
      this.startSending();
    }
  }

  // Note that driver-side changes are stored in 'otherChange' when the merged operations/model is sent
  // from the driver, and 'thisChange' when the merged operations/model is sent from a storageProxy.
  // In the former case, we want to look at what has changed between what the driver sent us and what
  // we now have. In the latter, the driver is only as up-to-date as our local model before we've
  // applied the operations.
  private noDriverSideChanges(thisChange: CRDTChange<T>, otherChange: CRDTChange<T>, messageFromDriver: boolean) {
    if (messageFromDriver) {
      return otherChange.changeType === ChangeType.Operations && otherChange.operations.length === 0;
    } else {
      return thisChange.changeType === ChangeType.Operations && thisChange.operations.length === 0;
    }
  }

  // Operation or model updates from connected StorageProxies will arrive here.
  // Additionally, StorageProxy objects may request a SyncRequest, which will
  // result in an up-to-date model being sent back to that StorageProxy.
  // a return value of true implies that the message was accepted, a
  // return value of false requires that the proxy send a model sync 
  async onProxyMessage(message: ProxyMessage<T>): Promise<boolean> {
    if (this.pendingException) {
      throw this.pendingException;
    }
    switch (message.type) {
      case ProxyMessageType.SyncRequest:
        await this.callbacks.get(message.id)({type: ProxyMessageType.ModelUpdate, model: this.localModel.getData(), id: message.id});
        return true;
      case ProxyMessageType.Operations:
        for (const operation of message.operations) {
          if (!this.localModel.applyOperation(operation)) {
            return false;
          }
        }
        await this.processModelChange({changeType: ChangeType.Operations, operations: message.operations}, null, this.version, false);
        return true;
      case ProxyMessageType.ModelUpdate: {
        const {modelChange, otherChange} = this.localModel.merge(message.model);
        await this.processModelChange(modelChange, otherChange, this.version, false);
        return true;
      }
      default:
        throw new CRDTError('Invalid operation provided to onProxyMessage');
    }
  }

  on(callback: ProxyCallback<T>) {
    const id = this.nextCallbackID++;
    this.callbacks.set(id, callback);
    return id;
  }

  off(callback: number) {
    this.callbacks.delete(callback);
  }
}
