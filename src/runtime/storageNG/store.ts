/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTModel, CRDTTypeRecord, CRDTChange, ChangeType, CRDTError} from "../crdt/crdt";
import {Type} from "../type";
import {Exists, Driver, DriverFactory} from "./drivers/driver-factory";

export enum StorageMode {Direct, Backing, ReferenceMode}

export enum ProxyMessageType { SyncRequest, ModelUpdate, Operations }

type ProxyMessage<T extends CRDTTypeRecord> = {type: ProxyMessageType.SyncRequest} | 
  {type: ProxyMessageType.ModelUpdate, model: T['data']} |
  {type: ProxyMessageType.Operations, operations: T['operation'][]}; 

type ProxyCallback<T extends CRDTTypeRecord> = (message: ProxyMessage<T>) => boolean;

export class Store<T extends CRDTTypeRecord> {
  readonly storageKey: string;
  exists: Exists;
  readonly type: Type;
  readonly mode: StorageMode;

  readonly constructors = new Map([[StorageMode.Direct, DirectStore],
                                   [StorageMode.Backing, null],
                                   [StorageMode.ReferenceMode, null]]);
  modelConstructor: new () => CRDTModel<T>;

  constructor(storageKey: string, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    this.storageKey = storageKey;
    this.exists = exists;
    this.type = type;
    this.mode = mode;
    this.modelConstructor = modelConstructor;
  }
  activate(): ActiveStore<T> {
    const activeStore = new (this.constructors.get(this.mode))<T>(this.storageKey, this.exists, this.type, this.mode, this.modelConstructor);
    this.exists = Exists.ShouldExist;
    return activeStore;
  }
}

export abstract class ActiveStore<T extends CRDTTypeRecord> extends Store<T> {
  abstract on(callback: ProxyCallback<T>): void;
  abstract off(callback: ProxyCallback<T>): void;
  abstract async onProxyMessage(message: ProxyMessage<T>): Promise<boolean>;
}

export class DirectStore<T extends CRDTTypeRecord> extends ActiveStore<T> {
  localModel: CRDTModel<T>;
  callbacks: ProxyCallback<T>[] = [];
  driver: Driver<T['data']>;
  inSync = true;

  constructor(storageKey: string, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    super(storageKey, exists, type, mode, modelConstructor);
    this.localModel = new modelConstructor();
    this.driver = DriverFactory.driverInstance(storageKey, exists);
    if (this.driver == null) {
      throw new CRDTError(`No driver exists to support storage key ${storageKey}`);
    }
    this.driver.registerReceiver(this.onReceive.bind(this));
  }
  // driver side
  async onReceive(model: T['data']): Promise<void> {
    const {modelChange} = this.localModel.merge(model);
    this.processModelChange(modelChange);
  }
  
  private async processModelChange(change: CRDTChange<T>) {
    if (change.changeType === ChangeType.Operations) {
      this.callbacks.forEach(cb => cb({type: ProxyMessageType.Operations, operations: change.operations}));
    } else {
      this.callbacks.forEach(cb => cb({type: ProxyMessageType.ModelUpdate, model: change.modelPostChange}));
    }
    if (this.inSync && change.changeType === ChangeType.Operations && change.operations.length === 0) {
      return;
    }
    this.inSync = await this.driver.send(this.localModel.getData());
  }

  // proxy side
  // a return value of true implies that the message was accepted, a
  // return value of false requires that the proxy send a model sync 
  async onProxyMessage(message: ProxyMessage<T>): Promise<boolean> { 
    switch (message.type) {
      case ProxyMessageType.SyncRequest:
        // TODO: how do we send this back to only the right proxy?
        this.callbacks.forEach(cb => cb({type: ProxyMessageType.ModelUpdate, model: this.localModel.getData()}));
        return true;
      case ProxyMessageType.Operations:
        for (const operation of message.operations) {
          if (!this.localModel.applyOperation(operation)) {
            return false;
          }
        }
        await this.processModelChange({changeType: ChangeType.Operations, operations: message.operations});
        return true;
      case ProxyMessageType.ModelUpdate:
        const {modelChange} = this.localModel.merge(message.model);
        await this.processModelChange(modelChange);
        return true;
      default:
        throw new CRDTError("Invalid operation provided to onProxyMessage");
    }
  }

  on(callback: ProxyCallback<T>) {
    this.callbacks.push(callback);
  }

  off(callback: ProxyCallback<T>) {
    const idx = this.callbacks.indexOf(callback);
    if (idx >= 0) {
      this.callbacks.splice(idx, 1);
    }
  }
}
