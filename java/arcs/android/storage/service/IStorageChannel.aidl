/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service;

import arcs.android.storage.service.IResultCallback;

/** A channel for communicating with a store in the storage service. */
interface IStorageChannel {
    /** Waits until the store becomes idle, and then triggers the provided callback. */
    oneway void idle(long timeoutMillis, IResultCallback resultCallback);

    /**
     * Forwards a message to the store.
     *
     * The message must contain a {@link arcs.android.storage.StorageServiceMessageProto} submessage
     * of the correct type for the specific {@link IStorageChannel} implemention being used.
     *
     * @param encodedMessage A byte array encoding of a {@link
     *     arcs.android.storage.StorageServiceMessageProto}.
     */
    oneway void sendMessage(in byte[] encodedMessage);

    /** Closes this channel. */
    oneway void close();
}
