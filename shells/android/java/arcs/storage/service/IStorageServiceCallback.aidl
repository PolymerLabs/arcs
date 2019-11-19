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

/** Variant of ProxyCallback intended for StorageService communications. */
interface IStorageServiceCallback {
    /** Handles an incoming SyncRequest. */
    void onSyncRequest(in ParcelableSyncRequest req, IResultCallback resultCallback);

    /** Handles an incoming ModelUpdate. */
    void onModelUpdate(in ParcelableModelUpdate update, IResultCallback resultCallback);

    /** Handles an incoming Operations. */
    void onOperations(in ParcelableOperations operations, IResultCallback resultCallback);
}
