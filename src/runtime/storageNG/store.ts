/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTModel, CRDTTypeRecord} from '../crdt/crdt.js';
import {Type} from '../type.js';
import {Exists} from './drivers/driver-factory.js';
import {StorageKey} from './storage-key.js';
import {StoreInterface, StorageMode, ActiveStore, ProxyMessageType, ProxyMessage, ProxyCallback, StorageCommunicationEndpoint, StorageCommunicationEndpointProvider, StoreConstructor} from './store-interface.js';
import {DirectStore} from './direct-store.js';
import {ReferenceModeStore, ReferenceModeStorageKey} from './reference-mode-store.js';
import {UnifiedStore, StoreInfo} from './unified-store.js';

export {
  ActiveStore,
  ProxyCallback,
  ProxyMessage,
  ProxyMessageType,
  StorageCommunicationEndpoint,
  StorageCommunicationEndpointProvider,
  StorageMode
};

// A representation of a store. Note that initially a constructed store will be
// inactive - it will not connect to a driver, will not accept connections from
// StorageProxy objects, and no data will be read or written.
//
// Calling 'activate()' will generate an interactive store and return it.
export class Store<T extends CRDTTypeRecord> extends UnifiedStore implements StoreInterface<T> {
  protected unifiedStoreType: 'Store' = 'Store';

  readonly storageKey: StorageKey;
  exists: Exists;
  readonly mode: StorageMode;

  // The last known version of this store that was stored in the serialized
  // representation.
  parsedVersionToken: string = null;
  modelConstructor: new () => CRDTModel<T>;

  // If there's a parsed model then it's stored here and provided to activate() when
  // reconstituting an ActiveStore.
  model: T['data'] | null;

  private activeStore: ActiveStore<T> | null;

  static readonly constructors = new Map<StorageMode, StoreConstructor>([
    [StorageMode.Direct, DirectStore],
    [StorageMode.ReferenceMode, ReferenceModeStore as StoreConstructor]
  ]);

  constructor(opts: StoreInfo & {storageKey: StorageKey, exists: Exists}) {
    super(opts);
    this.storageKey = opts.storageKey;
    this.exists = opts.exists;
    this.mode = opts.storageKey instanceof ReferenceModeStorageKey ? StorageMode.ReferenceMode : StorageMode.Direct;
    this.parsedVersionToken = opts.versionToken;
    this.model = opts.model as T['data'];
  }

  get versionToken() {
    if (this.activeStore) {
      return this.activeStore.versionToken;
    }
    return this.parsedVersionToken;
  }

  async activate(): Promise<ActiveStore<T>> {
    if (this.activeStore) {
      return this.activeStore;
    }

    if (Store.constructors.get(this.mode) == null) {
      throw new Error(`StorageMode ${this.mode} not yet implemented`);
    }
    const constructor = Store.constructors.get(this.mode);
    if (constructor == null) {
      throw new Error(`No constructor registered for mode ${this.mode}`);
    }
    const activeStore = await constructor.construct<T>({
      storageKey: this.storageKey,
      exists: this.exists,
      type: this.type,
      mode: this.mode,
      baseStore: this,
      versionToken: this.parsedVersionToken,
      model: this.model
    });
    this.exists = Exists.ShouldExist;
    this.activeStore = activeStore;
    return activeStore;
  }

  // TODO(shans): DELETEME once we've switched to this storage stack
  get referenceMode() {
    return this.mode === StorageMode.ReferenceMode;
  }
}
