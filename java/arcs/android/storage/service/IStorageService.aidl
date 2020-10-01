/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service;

import arcs.android.storage.service.IRegistrationCallback;
import arcs.android.storage.service.IResultCallback;
import arcs.android.storage.service.IStorageServiceCallback;

/**
 * Exposed API for the StorageService.
 *
 * TODO: subject to change.
 */
interface IStorageService {
    /**
     * Waits until the store residing within the storage service becomes idle, and triggers the
     * provided callback.
     */
    oneway void idle(long timeoutMillis, IResultCallback resultCallback);

    /**
     * Registers an {@link IStorageServiceCallback} with the StorageService and returns its callback
     * token.
     */
    oneway void registerCallback(IStorageServiceCallback proxyCallback, IRegistrationCallback resultCallback);

    /** Unregisters the callback associated with the given {@param token}. */
    oneway void unregisterCallback(int token, IResultCallback resultCallback);

    /**
     * Sends a proxy message to the StorageService.
     *
     * @param proxyMessage {@link arcs.android.storage.ProxyMessageProto},
     *     serialized to bytes.
     */
    oneway void sendProxyMessage(in byte[] proxyMessage);
}
