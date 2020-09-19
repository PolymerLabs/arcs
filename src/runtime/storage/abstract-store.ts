// /**
//  * @license
//  * Copyright (c) 2019 Google Inc. All rights reserved.
//  * This code may only be used under the BSD style license found at
//  * http://polymer.github.io/LICENSE.txt
//  * Code distributed by Google as part of this project is also
//  * subject to an additional IP rights grant found at
//  * http://polymer.github.io/PATENTS.txt
//  */

import {Comparable, compareStrings, IndentingStringBuilder} from '../../utils/lib-utils.js';
import {Type} from '../../types/lib-types.js';
import {StorageKey} from './storage-key.js';
import {PropagatedException} from '../arc-exceptions.js';
import {ClaimIsTag} from '../arcs-types/claim.js';
import {SingletonInterfaceStore, SingletonEntityStore, SingletonReferenceStore, CollectionEntityStore, CollectionReferenceStore, MuxEntityStore} from './storage.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {AnnotationRef} from '../arcs-types/annotation.js';
import {ActiveStore, Store} from './store.js';
import {StoreInfoNew} from './store-info.js';

export function isSingletonInterfaceStore(store: AbstractStore): store is SingletonInterfaceStore {
  return (store.storeInfo.type.isSingleton && store.storeInfo.type.getContainedType().isInterface);
}

export function isSingletonEntityStore(store: AbstractStore): store is SingletonEntityStore {
  return (store.storeInfo.type.isSingleton && store.storeInfo.type.getContainedType().isEntity);
}

export function isCollectionEntityStore(store: AbstractStore): store is CollectionEntityStore {
  return (store.storeInfo.type.isCollection && store.storeInfo.type.getContainedType().isEntity);
}

export function isSingletonReferenceStore(store: AbstractStore): store is SingletonReferenceStore {
  return (store.storeInfo.type.isSingleton && store.storeInfo.type.getContainedType().isReference);
}

export function isCollectionReferenceStore(store: AbstractStore): store is CollectionReferenceStore {
  return (store.storeInfo.type.isCollection && store.storeInfo.type.getContainedType().isReference);
}

export function isMuxEntityStore(store: AbstractStore): store is MuxEntityStore {
  return (store.storeInfo.type.isMuxType());
}

export function entityHasName(name: string) {
  return (store: AbstractStore) =>
    store.storeInfo.type.getContainedType().isEntity && store.storeInfo.type.getContainedType().getEntitySchema().names.includes(name);
}

export type AbstractStore = Store<CRDTTypeRecord>;

// /**
//  * This is a temporary interface used to unify old-style stores (previously storage/StorageProviderBase) and
//  * new-style stores (previously storage/Store). We should look into removing this as we've switched
//  * to the NG stack.
//  *
//  * Note that for old-style stores, StorageStubs are used *sometimes* to represent storage which isn't activated. For new-style stores,
//  * Store itself represents an inactive store, and needs to be activated using activate(). This will present some integration
//  * challenges :)
//  *
//  * Note also that old-style stores use strings for Storage Keys, while NG storage uses storage/StorageKey subclasses. This provides
//  * a simple test for determining whether a store is old or new.
//  *
//  * Common functionality between old- and new-style stores goes in this class.
//  * Once the old-style stores are deleted, this class can be merged into the new
//  * Store class.
//  */
// // export abstract class AbstractStore { // implements Comparable<AbstractStore> {
// //   abstract versionToken: string;
// //   get storageKey(): StorageKey { return this.storeInfo.storageKey; }
// //   get type(): Type { return this.storeInfo.type; }
// //   set type(type: Type) { this.storeInfo.type = type; }

// //   constructor(readonly storeInfo: StoreInfoNew) {}

// //   // Series of StoreInfo getters to make migration easier.
// //   get id() { return this.storeInfo.id; }
// //   get apiChannelMappingId() { return this.storeInfo.apiChannelMappingId; }
// //   get name() { return this.storeInfo.name; }
// //   get originalId() { return this.storeInfo.originalId; }
// //   get source() { return this.storeInfo.source; }
// //   get description() { return this.storeInfo.description; }
// //   get claims() { return this.storeInfo.claims; }

// //   abstract activate(): Promise<ActiveStore<CRDTTypeRecord>>;

// //   // TODO: Make these tags live inside StoreInfo.
// //   toManifestString(opts?: {handleTags?: string[], overrides?: Partial<StoreInfoNew>}): string {
// //     const overrides = (opts && opts.overrides ? opts.overrides : new StoreInfoNew({id: this.id}));
// //     overrides.versionToken = this.versionToken;
// //     return this.storeInfo.clone(overrides).toManifestString({handleTags: opts ? opts.handleTags : []});
// //   }
// // }
