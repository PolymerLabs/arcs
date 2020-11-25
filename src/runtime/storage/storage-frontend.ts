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

export interface StorageFrontend {
  Register(
    handle: StorageProxy<CRDTTypeRecord>,
    messagesCallback: ProxyCallback<CRDTTypeRecord>,
    idCallback: Consumer<number>): void;
  DirectStoreMuxerRegister(
    handle: StorageProxyMuxer<CRDTTypeRecord>,
    messagesCallback: ProxyCallback<CRDTTypeRecord>,
    idCallback: Consumer<number>): void;
  ProxyMessage(handle: StorageProxy<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>): void;
  StorageProxyMuxerMessage(handle: StorageProxyMuxer<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>): void;

  GetDirectStoreMuxer(callback: (proxy: StorageProxyMuxer<CRDTTypeRecord>, key: string) => void, storageKey: string, type: Type);
  onGetDirectStoreMuxerCallback(storeInfo: StoreInfo<Type>, callback: (proxy: StorageProxyMuxer<CRDTTypeRecord>, key: string) => void, name: string, id: string);

  ReportExceptionInHost(exception: PropagatedException);
}
