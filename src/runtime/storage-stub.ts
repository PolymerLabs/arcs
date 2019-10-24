/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';
import {compareStrings} from './recipe/comparable.js';
import {ClaimIsTag} from './particle-claim.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {Type} from './type.js';
import {VolatileStorageProvider} from './storage/volatile-storage.js';
import {UnifiedStore, UnifiedActiveStore} from './storageNG/unified-store.js';
import {ProxyCallback} from './storageNG/store.js';

// TODO(shans): Make sure that after refactor Storage objects have a lifecycle and can be directly used
// deflated rather than requiring this stub.
export class StorageStub extends UnifiedStore {
  protected unifiedStoreType: 'StorageStub' = 'StorageStub';

  constructor(type: Type,
              id: string,
              name: string,
              public readonly storageKey: string,
              public readonly storageProviderFactory: StorageProviderFactory,
              originalId: string,
              claims: ClaimIsTag[],
              description: string,
              public readonly versionToken: string,
              source?: string,
              origin?: 'file' | 'resource' | 'storage',
              public referenceMode: boolean = false,
              public readonly model?: {}[]) {
    super({type, id, name, originalId, claims, description, source, origin});
  }

  // No-op implementations for `on` and `off`.
  // TODO: These methods should not live on UnifiedStore; they only work on
  // active stores (e.g. StorageProviderBase). Move them to a new
  // UnifiedActiveStore interface.
  on(callback: ProxyCallback<null>): number {
    return -1;
  }
  off(callback: number): void {}

  async activate(): Promise<UnifiedActiveStore> {
    return this.inflate();
  }

  async inflate(storageProviderFactory?: StorageProviderFactory) {
    const factory = storageProviderFactory || this.storageProviderFactory;
    const store = this.isBackedByManifest()
        ? await factory.construct(this.id, this.type, this.storageKey)
        : await factory.connect(this.id, this.type, this.storageKey);
    assert(store != null, 'inflating missing storageKey ' + this.storageKey);

    if (this.isBackedByManifest()) {
      // Constructed store: set the reference mode according to the stub.
      store.referenceMode = this.referenceMode;
    } else {
      // Connected store: sync the stub's reference mode with the store.
      this.referenceMode = store.referenceMode;
    }

    store.storeInfo = {...this.storeInfo};
    if (this.isBackedByManifest()) {
      const version = this.versionToken == null ? null : Number(this.versionToken);
      await (store as VolatileStorageProvider).fromLiteral({version, model: this.model});
    }
    return store;
  }

  toLiteral() {
    return undefined; // Fake to match StorageProviderBase;
  }

  isBackedByManifest(): boolean {
    return (this.versionToken !== undefined && !!this.model);
  }

  _compareTo(other: UnifiedStore): number {
    let cmp: number;
    cmp = compareStrings(this.name, other.name);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.id, other.id);
    if (cmp !== 0) return cmp;
    return 0;
  }
}
