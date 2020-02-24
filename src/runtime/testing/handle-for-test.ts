/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {UnifiedStore} from '../storageNG/unified-store.js';
import {Arc} from '../arc.js';
import {SingletonHandle, CollectionHandle} from '../storageNG/handle.js';
import {ActiveStore} from '../storageNG/store.js';
import {Flags} from '../flags.js';
import {StorageProxy} from '../storageNG/storage-proxy.js';
import {handleFor, Singleton, Storable, Collection} from '../handle.js';
import {Referenceable, CRDTCollectionTypeRecord} from '../crdt/crdt-collection.js';
import {CRDTTypeRecord} from '../crdt/crdt.js';
import {CRDTSingletonTypeRecord} from '../crdt/crdt-singleton.js';
import {Manifest} from '../manifest.js';
import {Entity, SerializedEntity} from '../entity.js';
import {RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {VolatileStorageKey} from '../../runtime/storageNG/drivers/volatile.js';
import {StorageKey} from '../../runtime/storageNG/storage-key.js';
import {ArcId} from '../../runtime/id.js';


/**
 * Creates a singleton handle for a store for testing purposes. Returns an
 * appropriate OldHandle/HandleNG type depending on the storage migration flag.
 */
// TODO: Can we correctly type the result here?
// tslint:disable-next-line: no-any
export async function singletonHandleForTest(arcOrManifest: Arc | Manifest, store: UnifiedStore): Promise<SingletonHandle<any>> {
  if (Flags.useNewStorageStack) {
    return new SingletonHandle(
      arcOrManifest.generateID('test-handle').toString(),
      await createStorageProxyForTest<CRDTSingletonTypeRecord<SerializedEntity>>(arcOrManifest, store),
      arcOrManifest.idGenerator,
      /* particle= */ null, // TODO: We don't have a particle here.
      /* canRead= */ true,
      /* canWrite= */ true,
      /* name?= */ null);
  } else {
    const handle = handleFor(store, arcOrManifest.idGenerator);
    if (handle instanceof Singleton) {
      // tslint:disable-next-line: no-any
      return handle as unknown as SingletonHandle<any>;
    } else {
      throw new Error('Expected Singleton.');
    }
  }
}

/**
 * Creates a collection handle for a store for testing purposes. Returns an
 * appropriate OldHandle/HandleNG type depending on the storage migration flag.
 */
// TODO: Can we correctly type the result here?
// tslint:disable-next-line: no-any
export async function collectionHandleForTest(arcOrManifest: Arc | Manifest, store: UnifiedStore): Promise<CollectionHandle<any>> {
  if (Flags.useNewStorageStack) {
    return new CollectionHandle(
      arcOrManifest.generateID('test-handle').toString(),
      await createStorageProxyForTest<CRDTCollectionTypeRecord<SerializedEntity>>(arcOrManifest, store),
      arcOrManifest.idGenerator,
      /* particle= */ null, // TODO: We don't have a particle here.
      /* canRead= */ true,
      /* canWrite= */ true,
      /* name?= */ null);
  } else {
    const handle = handleFor(store, arcOrManifest.idGenerator);
    if (handle instanceof Collection) {
      return collectionHandleWrapper(handle);
    } else {
      throw new Error('Expected Collection.');
    }
  }
}

/**
 * Creates a storage key prefix for a store for testing purposes. Returns an
 * appropriate string or NG storage key type depending on the storage migration flag.
 */
export function storageKeyPrefixForTest(): ((arcId: ArcId) => StorageKey) {
  return arcId => new VolatileStorageKey(arcId, '');
}
export function volatileStorageKeyPrefixForTest(): (arcId: ArcId) => StorageKey {
  return storageKeyPrefixForTest();
}
export function ramDiskStorageKeyPrefixForTest(): (arcId: ArcId) => StorageKey {
  return arcId => new RamDiskStorageKey('');
}

export function storageKeyForTest(arcId: ArcId): StorageKey {
  return storageKeyPrefixForTest()(arcId);
}

async function createStorageProxyForTest<T extends CRDTTypeRecord>(
    arcOrManifest: Arc | Manifest, store: UnifiedStore): Promise<StorageProxy<T>> {
  const activeStore = await store.activate();
  if (!(activeStore instanceof ActiveStore)) {
    throw new Error('Expected an ActiveStore.');
  }
  return new StorageProxy(arcOrManifest.generateID('test-proxy').toString(), activeStore, store.type, store.storageKey.toString());
}

/**
 * Hacky function which converts an old-style singleton handle into the new
 * style. Most of the properties/methods are the same, but not all. Some of the
 * methods expect slightly different arguments, so we will cast between the
 * expected types recklessly.
 *
 * Can be deleted after we've migrated to the new storage stack.
 */
function collectionHandleWrapper<T extends Entity>(oldHandle: Collection): CollectionHandle<T> {
  const handle = oldHandle as unknown as CollectionHandle<T>;

  handle.add = async (entity: T): Promise<boolean> => {
    await oldHandle.store(entity as unknown as Storable);
    return true;
  };

  handle.addMultiple = async (entities: T[]): Promise<boolean> => {
    return Promise.all(entities.map(e => handle.add(e))).then(array => array.every(Boolean));
  };

  return handle;
}
