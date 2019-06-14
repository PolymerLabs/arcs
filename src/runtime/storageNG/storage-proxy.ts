/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {CRDTChange, CRDTConsumerType, CRDTData, CRDTError, CRDTModel, CRDTOperation, CRDTTypeRecord, VersionMap} from '../crdt/crdt.js';
import {Handle} from './handle.js';
import {ActiveStore, ProxyMessage, ProxyMessageType} from './store.js';

/**
 * TODO: describe this class.
 */
export class StorageProxy<T extends CRDTTypeRecord> {
  private handles: Handle<T>[] = [];
  private crdt: CRDTModel<T>;
  private id: number;
  private store: ActiveStore<T>;

  constructor(crdt: CRDTModel<T>, store: ActiveStore<T>) {
    this.crdt = crdt;
    this.registerWithStore(store);
  }

  registerWithStore(store: ActiveStore<T>) {
    this.id = store.on(x => this.onMessage(x));
    this.store = store;
  }

  registerHandle(h: Handle<T>): VersionMap {
    this.handles.push(h);
    return new Map(this.crdt.getData().version);
  }

  async applyOp(op: CRDTOperation): Promise<boolean> {
    if (!this.crdt.applyOperation(op)) {      
      return false;      
    }
    const message: ProxyMessage<T> = {
      type: ProxyMessageType.Operations,
      operations: [op],
      id: this.id
    };
    await this.store.onProxyMessage(message);
    this.notifyUpdate([op]);
    return true;
  }

  async getParticleView(): Promise<T['consumerType']> {
    await this.synchronizeModel();
    return this.crdt.getParticleView()!;
  }

  async onMessage(message: ProxyMessage<T>): Promise<boolean> {
    assert(message.id === this.id);
    switch (message.type) {
      case ProxyMessageType.ModelUpdate:
        this.crdt.merge(message.model);
        this.notifySync();
        break;
      case ProxyMessageType.Operations:
        for (const op of message.operations) {
          if (!this.crdt.applyOperation(op)) {
            // If we cannot cleanly apply ops, sync the whole model.
            await this.synchronizeModel();
            // TODO do we need to notify that we are desynced? and return?
          }
        }
        this.notifyUpdate(message.operations);
        break;
      case ProxyMessageType.SyncRequest:
        await this.store.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: this.crdt.getData(), id: this.id});
        break;
      default:
        throw new CRDTError(
            `Invalid operation provided to onMessage, message: ${message}`);
    }
    return true;
  }

  // TODO: use a Scheduler to deliver this in batches by particle.
  private notifyUpdate(operations: CRDTOperation[]) {
    for (const handle of this.handles) {
      if (handle.options.notifyUpdate) {
        handle.onUpdate(operations);
      } else if (handle.options.keepSynced) {
        // keepSynced but not notifyUpdate, notify of the new model.
        handle.onSync();
      }
    }
  }

  private notifySync() {
    for (const handle of this.handles) {
      if (handle.options.notifySync) {
        handle.onSync();
      }
    }
  }

  private async synchronizeModel(): Promise<boolean> {
    return this.store.onProxyMessage({type: ProxyMessageType.SyncRequest, id: this.id});
  }
}
