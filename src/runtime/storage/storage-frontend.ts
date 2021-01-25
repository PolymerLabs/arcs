/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProxy} from './storage-proxy.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {ProxyCallback} from './store-interface.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {Consumer} from '../../utils/lib-utils.js';
import {ProxyMessage} from './store-interface.js';
import {Type} from '../../types/lib-types.js';
import {PropagatedException} from '../arc-exceptions.js';
import {StoreInfo} from './store-info.js';
import {IdGenerator} from '../id.js';
import {Producer} from '../../utils/lib-utils.js';

export interface StorageFrontend {
  registerStorageProxy(storageProxy: StorageProxy<CRDTTypeRecord>,
                       messagesCallback: ProxyCallback<CRDTTypeRecord>,
                       idCallback: Consumer<number>): void;

  directStorageProxyMuxerRegister(storageProxyMuxer: StorageProxyMuxer<CRDTTypeRecord>,
                                  messagesCallback: ProxyCallback<CRDTTypeRecord>,
                                  idCallback: Consumer<number>): void;

  storageProxyMessage(storageProxy: StorageProxy<CRDTTypeRecord>,
                      message: ProxyMessage<CRDTTypeRecord>): void;

  storageProxyMuxerMessage(storageProxyMuxer: StorageProxyMuxer<CRDTTypeRecord>,
                           message: ProxyMessage<CRDTTypeRecord>): void;

  getStorageProxyMuxer(storageKey: string, type: Type);
  idGenerator: IdGenerator;
  generateID: Producer<string>;
  reportExceptionInHost(exception: PropagatedException);
}
