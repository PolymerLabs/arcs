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
import {StorageProviderBase} from './storage/storage-provider-base.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {Type} from './type.js';
import {VolatileStorageProvider} from './storage/volatile-storage.js';
import {UnifiedStore} from './storageNG/unified-store.js';

// TODO(shans): Make sure that after refactor Storage objects have a lifecycle and can be directly used
// deflated rather than requiring this stub.
export class StorageStub extends UnifiedStore {
  protected unifiedStoreType: 'StorageStub' = 'StorageStub';

  constructor(public readonly type: Type,
              public readonly id: string,
              public readonly name: string,
              public readonly storageKey: string,
              public readonly storageProviderFactory: StorageProviderFactory,
              public readonly originalId: string,
                /** Trust tags claimed by this data store. */
              public readonly claims: ClaimIsTag[],
              public readonly description: string,
              public readonly version?: number,
              public readonly source?: string,
              public referenceMode: boolean = false,
              public readonly model?: {}[]) {
    super();
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

    store.originalId = this.originalId;
    store.name = this.name;
    store.source = this.source;
    store.description = this.description;
    if (this.isBackedByManifest()) {
      await (store as VolatileStorageProvider).fromLiteral({version: this.version, model: this.model});
    }
    return store;
  }

  toLiteral() {
    return undefined; // Fake to match StorageProviderBase;
  }

  isBackedByManifest(): boolean {
    return (this.version !== undefined && !!this.model);
  }

  toString(handleTags: string[]): string {
    const results: string[] = [];
    const handleStr: string[] = [];
    handleStr.push(`store`);
    if (this.name) {
      handleStr.push(`${this.name}`);
    }
    handleStr.push(`of ${this.type.toString()}`);
    if (this.id) {
      handleStr.push(`'${this.id}'`);
    }
    if (this.originalId) {
      handleStr.push(`!!${this.originalId}`);
    }
    if (this.version !== undefined) {
      handleStr.push(`@${this.version}`);
    }
    if (handleTags && handleTags.length) {
      handleStr.push(`${handleTags.join(' ')}`);
    }
    if (this.source) {
      handleStr.push(`in '${this.source}'`);
    } else if (this.storageKey) {
      handleStr.push(`at '${this.storageKey}'`);
    }
    // TODO(shans): there's a 'this.source' in StorageProviderBase which is sometimes
    // serialized here too - could it ever be part of StorageStub?
    results.push(handleStr.join(' '));
    if (this.claims.length > 0) {
      results.push(`  claim is ${this.claims.map(claim => claim.tag).join(' and is ')}`);
    }
    if (this.description) {
      results.push(`  description \`${this.description}\``);
    }
    return results.join('\n');
  }

  _compareTo(other: StorageProviderBase): number {
    let cmp: number;
    cmp = compareStrings(this.name, other.name);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.id, other.id);
    if (cmp !== 0) return cmp;
    return 0;
  }
}
