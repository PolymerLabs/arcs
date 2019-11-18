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

package arcs.storage.service;

import arcs.storage.parcelables.ParcelableModelUpdate;
import arcs.storage.parcelables.ParcelableOperations;
import arcs.storage.parcelables.ParcelableSyncRequest;
import arcs.storage.service.IResultCallback;
import arcs.storage.service.IStorageServiceCallback;

/** Exposed API for the StorageService. */
interface IStorageService {
    /**
     * Registers an {@link IStorageServiceCallback} with the StorageService and returns its callback
     * token.
     */
    int registerCallback(IStorageServiceCallback callback);

    /** Unregisters the callback associated with the given {@param token}. */
    void unregisterCallback(int token);

    /** Sends the StorageService a SyncRequest ParcelableProxyMessage. */
    void sendSyncRequest(in ParcelableSyncRequest req, IResultCallback resultCallback);

    /** Sends the StorageService a ModelUpdate ParcelableProxyMessage. */
    void sendModelUpdate(in ParcelableModelUpdate update, IResultCallback resultCallback);

    /** Sends the StorageService an Operations ParcelableProxyMessage. */
    void sendOperations(in ParcelableOperations operations, IResultCallback resultCallback);
}
