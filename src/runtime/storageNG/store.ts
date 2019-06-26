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
  
  async idle() {
    return Promise.resolve();
  }

  abstract on(callback: ProxyCallback<T>): number;
  abstract off(callback: number): void;
  abstract async onProxyMessage(message: ProxyMessage<T>): Promise<boolean>;
}

enum DirectStoreState {Idle = 'Idle', AwaitingResponse = 'AwaitingResponse', AwaitingResponseDirty = 'AwaitingResponseDirty', AwaitingDriverModel = 'AwaitingDriverModel'}

export class DirectStore<T extends CRDTTypeRecord> extends ActiveStore<T> {
  localModel: CRDTModel<T>;
  callbacks = new Map<number, ProxyCallback<T>>();
  driver: Driver<T['data']>;
  private nextCallbackID = 1;
  private version = 0;
  private pendingException: Error | null = null;
  private pendingResolves: Function[] = [];
  private pendingRejects: Function[] = [];
  private pendingDriverModels: {model: T['data'], version: number}[] = [];
  private state: DirectStoreState = DirectStoreState.Idle;


  /* 
   * This class should only ever be constructed via the static construct method
   */
  private constructor(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    super(storageKey, exists, type, mode, modelConstructor);
  }

  async idle() {
    if (this.pendingException) {
      return Promise.reject(this.pendingException);
    }
    if (this.state === DirectStoreState.Idle) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.pendingResolves.push(resolve);
      this.pendingRejects.push(reject);
    });
  }

  private setState(state: DirectStoreState) {
    this.state = state;
    if (state === DirectStoreState.Idle) {
      // If we are already idle, this won't notify external parties.
      this.notifyIdle();
    }
  }

  private notifyIdle() {
    if (this.pendingException) {
      // this is termination.
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
    this.pendingDriverModels.push({model, version});
    if (this.state === DirectStoreState.AwaitingResponse || this.state === DirectStoreState.AwaitingResponseDirty) {
      return;
    }
    this.applyPendingDriverModels();
  }
  
  private deliverCallbacks(thisChange: CRDTChange<T>) {
    if (thisChange.changeType === ChangeType.Operations && thisChange.operations.length > 0) {
      this.callbacks.forEach((cb, id) => cb({type: ProxyMessageType.Operations, operations: thisChange.operations, id}));
    } else if (thisChange.changeType === ChangeType.Model) {
      this.callbacks.forEach((cb, id) => cb({type: ProxyMessageType.ModelUpdate, model: thisChange.modelPostChange, id}));
    }
  }

  private async processModelChange(modelChange: CRDTChange<T>, otherChange: CRDTChange<T>, version: number) {
    this.deliverCallbacks(modelChange);
    await this.updateStateAndAct(this.noDriverSideChanges(modelChange, otherChange, false), version, false);
  }

  // This function implements a state machine that controls when data is sent to the driver.
  // You can see the state machine in all its glory at the following URL:
  //
  // https://github.com/PolymerLabs/arcs/wiki/Store-object-State-Machine
  //
  private async updateStateAndAct(noDriverSideChanges: boolean, version: number, messageFromDriver: boolean) {
      
    // Don't send to the driver if we're already in sync and there are no driver-side changes.
    if (noDriverSideChanges) {
      // Need to record the driver version so that we can continue to send.
      this.setState(DirectStoreState.Idle);
      this.version = version;
      return;
    }

    switch (this.state) {
    case DirectStoreState.AwaitingDriverModel:
      if (!messageFromDriver) {
        return;
      }
      /* falls through */
    case DirectStoreState.Idle:
      // This loop implements sending -> AwaitingResponse -> AwaitingResponseDirty -> sending.
      // Breakouts happen if:
      //  (1) a response arrives while still AwaitingResponse. This returns the store to Idle.
      //  (2) a negative response arrives. This means we're now waiting for driver models
      //      (AwaitingDriverModel). Note that in this case we are likely to end up back in
      //      this loop when a driver model arrives.
      while (true) {
        this.setState(DirectStoreState.AwaitingResponse);
        // Work around a typescript compiler bug. Apparently typescript won't guarantee that
        // a Map key you've just set will exist, but is happy to assure you that a private
        // member variable couldn't possibly change in any function outside the local scope
        // when within a switch statement. 
        this.state = DirectStoreState.AwaitingResponse;
        version += 1;
        this.version = version;
        const response = await this.driver.send(this.localModel.getData(), version);
        if (response) {
          if (this.state === DirectStoreState.AwaitingResponse) {
            this.setState(DirectStoreState.Idle);
            this.applyPendingDriverModels();
            break;
          }
          if (this.state !== DirectStoreState.AwaitingResponseDirty) {
            // This shouldn't be possible as only a 'nack' should put us into
            // AwaitingDriverModel, and only the above code should put us back
            // into Idle.
            throw new Error('reached impossible state in store state machine');
          }
          // fallthrough to re-execute the loop.
        } else {
          this.setState(DirectStoreState.AwaitingDriverModel);
          this.applyPendingDriverModels();
          break;
        }
      }
      return;
    case DirectStoreState.AwaitingResponse:
      this.setState(DirectStoreState.AwaitingResponseDirty);
      return;
    case DirectStoreState.AwaitingResponseDirty:
      return;
    default:
      throw new Error('reached impossible default state in switch statement');
    }
  }

  private applyPendingDriverModels() {
    if (this.pendingDriverModels.length > 0) {
      const models = this.pendingDriverModels;
      this.pendingDriverModels = [];
      let noDriverSideChanges = true;
      let theVersion = 0;
      for (const {model, version} of models) {
        try {
          const {modelChange, otherChange} = this.localModel.merge(model);
          this.deliverCallbacks(modelChange);
          noDriverSideChanges = noDriverSideChanges && this.noDriverSideChanges(modelChange, otherChange, true);
          theVersion = version; 
        } catch (e) {
          this.pendingException = e;
          this.notifyIdle();
          return;
        }
      }
      void this.updateStateAndAct(noDriverSideChanges, theVersion, true);
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
      case ProxyMessageType.Operations: {
        for (const operation of message.operations) {
          if (!this.localModel.applyOperation(operation)) {
            return false;
          }
        }
        const change: CRDTChange<T> = {changeType: ChangeType.Operations, operations: message.operations};
        void this.processModelChange(change, null, this.version);
        return true;
      }
      case ProxyMessageType.ModelUpdate: {
        const {modelChange, otherChange} = this.localModel.merge(message.model);
        void this.processModelChange(modelChange, otherChange, this.version);
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
