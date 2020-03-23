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

import arcs.android.storage.ParcelableProxyMessage;
import arcs.android.storage.service.IResultCallback;
import arcs.android.storage.service.IStorageServiceCallback;

/**
 * Exposed API for the StorageService.
 *
 * TODO: subject to change.
 */
interface IStorageService {
    /**
     * Issues a one-shot request for the current state of the binding context's {@code CrdtData}.
     *
     * <p>Will respond by calling the {@code callback} with a
     * {@code ParcelableProxyMessage.ModelUpdate} containing the requested data.
     */
    oneway void getLocalData(IStorageServiceCallback callback);

    /**
     * Registers an {@link IStorageServiceCallback} with the StorageService and returns its callback
     * token.
     */
    int registerCallback(IStorageServiceCallback callback);

    /** Unregisters the callback associated with the given {@param token}. */
    void unregisterCallback(int token);

    /** Sends a proxy message to the StorageService. */
    oneway void sendProxyMessage(in ParcelableProxyMessage message, IResultCallback resultCallback);
}
