/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKey} from '../storage-key.js';

export enum Exists {ShouldExist, ShouldCreate, MayExist}
export type ReceiveMethod<T> = (model: T, version: number) => void;

// Interface that drivers must support.
//
// Note the threading of a version number here; each model provided
// by the driver to the Store (using the receiver) is paired with a version,
// as is each model sent from the Store to the driver (using Driver.send()).
//
// This threading is used to track whether driver state has changed while
// the Store is processing a particular model. send() should always fail
// if the version isn't exactly 1 greater than the current internal version.
export abstract class Driver<Data> {
    storageKey: StorageKey;
    exists: Exists;
    constructor(storageKey: StorageKey, exists: Exists) {
      this.storageKey = storageKey;
      this.exists = exists;
    }
    abstract registerReceiver(receiver: ReceiveMethod<Data>, token?: string): void;
    abstract async send(model: Data, version: number): Promise<boolean>;

    // Return a token that represents the current state of the data.
    // This can be provided to registerReceiver, and will impact what
    // data is delivered on initialization (only "new" data should be
    // delivered, though note that this can be satisfied by sending
    // a model for merging rather than by remembering a set of ops)
    abstract getToken(): string | null;

    // these methods only available to Backing Stores and will
    // be removed once entity mutation is performed on CRDTs
    // tslint:disable-next-line: no-any
    abstract async write(key: StorageKey, value: any): Promise<void>;
    // tslint:disable-next-line: no-any
    abstract async read(key: StorageKey): Promise<any>;
  }
