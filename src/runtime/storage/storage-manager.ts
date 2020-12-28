/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {CRDTTypeRecord} from '../../crdt//lib-crdt.js';
import {TypeToCRDTTypeRecord} from './storage.js';
import {ActiveStore} from './active-store.js';
import {Type} from '../../types/lib-types.js';
import {StoreInfo} from './store-info.js';
import {StorageService} from './storage-service.js';
import {StorageCommunicationEndpointProvider} from './store-interface.js';

/**
 * A StorageEndpointManager returns ActiveStores for the given StoreInfo.
 */
// TODO(b/163702684): Refactor to return StorageCommunicationEndpoint instead and replace
// StorageEndpointManager with StorageCommunicationEndpointProvider everywhere.
export interface StorageEndpointManager extends StorageCommunicationEndpointProvider {
  storageService: StorageService;
  getActiveStore<T extends Type>(storeInfo: StoreInfo<T>): Promise<ActiveStore<TypeToCRDTTypeRecord<T>>>;
}
