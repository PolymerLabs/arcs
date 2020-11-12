/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {CRDTTypeRecord} from '../../crdt/internal/crdt.js';
import {CRDTMuxEntity, TypeToCRDTTypeRecord, CRDTTypeRecordToType} from './storage.js';
import {ProxyMessage} from './store-interface.js';
import {ActiveStore} from './active-store.js';
import {Type} from '../../types/lib-types.js';
import {noAwait} from '../../utils/lib-utils.js';
import {StoreInfo} from './store-info.js';
import {StorageKey} from './storage-key.js';
import {Exists} from './drivers/driver.js';
import {StorageEndpointManager} from './storage-manager.js';
import {Consumer} from '../../utils/lib-utils.js';

/**
 * Storage stack API.
 */
export interface StorageService {
  /**
   * Registers callbacks for the given store.
   */
  onRegister(storeInfo: StoreInfo<Type>, messagesCallback: Consumer<{}>, idCallback: Consumer<{}>);
  /**
   * Passes a proxy message to the store.
   */
  onProxyMessage(storeInfo: StoreInfo<Type>, message: ProxyMessage<CRDTTypeRecord>);
}
