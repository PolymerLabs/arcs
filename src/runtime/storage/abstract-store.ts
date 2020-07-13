/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Comparable, compareStrings} from '../recipe/comparable.js';
import {Type} from '../type.js';
import {StorageKey} from './storage-key.js';
import {PropagatedException} from '../arc-exceptions.js';
import {ClaimIsTag} from '../claim.js';
import {SingletonInterfaceStore, SingletonEntityStore, SingletonReferenceStore, CollectionEntityStore, CollectionReferenceStore, MuxEntityStore} from './storage.js';
import {AbstractActiveStore} from './store-interface.js';
import {CRDTTypeRecord} from '../crdt/crdt.js';
import {AnnotationRef} from '../recipe/annotation.js';
import {ManifestStringBuilder} from '../manifest-string-builder.js';

export function isSingletonInterfaceStore(store: AbstractStore): store is SingletonInterfaceStore {
  return (store.type.isSingleton && store.type.getContainedType().isInterface);
}

export function isSingletonEntityStore(store: AbstractStore): store is SingletonEntityStore {
  return (store.type.isSingleton && store.type.getContainedType().isEntity);
}

export function isCollectionEntityStore(store: AbstractStore): store is CollectionEntityStore {
  return (store.type.isCollection && store.type.getContainedType().isEntity);
}

export function isSingletonReferenceStore(store: AbstractStore): store is SingletonReferenceStore {
  return (store.type.isSingleton && store.type.getContainedType().isReference);
}

export function isCollectionReferenceStore(store: AbstractStore): store is CollectionReferenceStore {
  return (store.type.isCollection && store.type.getContainedType().isReference);
}

export function isMuxEntityStore(store: AbstractStore): store is MuxEntityStore {
  return (store.type.isMuxType());
}

export function entityHasName(name: string) {
  return (store: AbstractStore) =>
    store.type.getContainedType().isEntity && store.type.getContainedType().getEntitySchema().names.includes(name);
}

/**
 * This is a temporary interface used to unify old-style stores (previously storage/StorageProviderBase) and
 * new-style stores (previously storage/Store). We should look into removing this as we've switched
 * to the NG stack.
 *
 * Note that for old-style stores, StorageStubs are used *sometimes* to represent storage which isn't activated. For new-style stores,
 * Store itself represents an inactive store, and needs to be activated using activate(). This will present some integration
 * challenges :)
 *
 * Note also that old-style stores use strings for Storage Keys, while NG storage uses storage/StorageKey subclasses. This provides
 * a simple test for determining whether a store is old or new.
 *
 * Common functionality between old- and new-style stores goes in this class.
 * Once the old-style stores are deleted, this class can be merged into the new
 * Store class.
 */
export abstract class AbstractStore implements Comparable<AbstractStore> {
  // TODO: Once the old storage stack is gone, this should only be of type
  // StorageKey, and can be moved into StoreInfo.
  abstract storageKey: StorageKey;
  abstract versionToken: string;
  abstract referenceMode: boolean;
  abstract type: Type;

  storeInfo: StoreInfo;

  constructor(storeInfo: StoreInfo) {
    this.storeInfo = storeInfo;
  }

  // Series of StoreInfo getters to make migration easier.
  get id() { return this.storeInfo.id; }
  get apiChannelMappingId() { return this.id; }
  get name() { return this.storeInfo.name; }
  get originalId() { return this.storeInfo.originalId; }
  get source() { return this.storeInfo.source; }
  get description() { return this.storeInfo.description; }
  get claims() { return this.storeInfo.claims; }

  abstract activate(): Promise<AbstractActiveStore<CRDTTypeRecord>>;

  // TODO: Delete this method when the old-style storage is deleted.
  reportExceptionInHost(exception: PropagatedException): void {
    // This class lives in the host, so it's safe to just rethrow the exception.
    throw exception;
  }

  _compareTo(other: AbstractStore): number {
    let cmp: number;
    cmp = compareStrings(this.name, other.name);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.versionToken, other.versionToken);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.source, other.source);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.id, other.id);
    if (cmp !== 0) return cmp;
    return 0;
  }

  // TODO: Make these tags live inside StoreInfo.
  toManifestString(opts?: {handleTags?: string[], overrides?: Partial<StoreInfo>}): string {
    opts = opts || {};
    const info = {...this.storeInfo, ...opts.overrides};
    const builder = new ManifestStringBuilder();
    if ((this.storeInfo.annotations || []).length > 0) {
      builder.push(...this.storeInfo.annotations.map(a => a.toString()));
    }
    const handleStr: string[] = [];
    handleStr.push(`store`);
    if (info.name) {
      handleStr.push(`${info.name}`);
    }
    handleStr.push(`of ${this.type.toString()}`);
    if (info.id) {
      handleStr.push(`'${info.id}'`);
    }
    if (info.originalId) {
      handleStr.push(`!!${info.originalId}`);
    }
    if (this.versionToken != null) {
      handleStr.push(`@${this.versionToken}`);
    }
    if (opts.handleTags && opts.handleTags.length) {
      handleStr.push(`${opts.handleTags.map(tag => `#${tag}`).join(' ')}`);
    }
    if (info.source) {
      if (info.origin === 'file') {
        handleStr.push(`in '${info.source}'`);
      } else {
        handleStr.push(`in ${info.source}`);
        if (info.includeKey) {
          handleStr.push(`at '${info.includeKey}'`);
        }
      }
    } else if (this.storageKey) {
      handleStr.push(`at '${this.storageKey}'`);
    }
    builder.push(handleStr.join(' '));
    builder.withIndent(builder => {
      if (info.claims && info.claims.size > 0) {
        for (const [target, claims] of info.claims) {
          const claimClause = target.length ? `claim field ${target}` : 'claim';
          builder.push(`${claimClause} is ${claims.map(claim => claim.tag).join(' and is ')}`);
        }
      }
      if (info.description) {
        builder.push(`description \`${info.description}\``);
      }
    });
    return builder.toString();
  }
}

/** Assorted properties about a store. */
export type StoreInfo = {
  readonly id: string;
  name?: string;  // TODO: Find a way to make this readonly.
  readonly originalId?: string;
  readonly source?: string;
  readonly origin?: 'file' | 'resource' | 'storage' | 'inline';
  readonly description?: string;

  /** Trust tags claimed by this data store. */
  readonly claims?: StoreClaims;
  readonly annotations?: AnnotationRef[];

  readonly versionToken?: string;
  readonly model?: {};

  /**
   * If set, include this storage key in the serialization.
   * Used to ensure that the location of volatile storage is stable
   * across serialization/deserialization.
   */
  readonly includeKey?: string;
};

/**
 * Dataflow claims defined on a store. Maps from target field to a list of tags
 * claimed on the field. Target can be an empty string, meaning it applies to
 * the entire schema for the store, or a dotted string pointing to a field
 * inside it (e.g. someField.myRef.foo).
 */
export type StoreClaims = Map<string, ClaimIsTag[]>;
