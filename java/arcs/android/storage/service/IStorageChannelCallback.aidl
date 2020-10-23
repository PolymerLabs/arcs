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

import arcs.android.storage.service.IStorageChannel;

/** Callback for asynchronously receiving messages from a storage channel. */
interface IStorageChannelCallback {
    /**
     * Invoked whenever the storage channel responds with a message.
     *
     * @param encodedMessage a byte array encoding of a {@link
     *     arcs.android.storage.StorageServiceMessageProto}
     */
    oneway void onMessage(in byte[] encodedMessage);

    /**
     * Invoked when the storage channel has been created.
     *
     * @param channel the created storage channel
     */
    oneway void onCreate(IStorageChannel channel);
}
