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

import arcs.android.storage.service.IMessageCallback;
import arcs.android.storage.service.IStorageChannel;
import arcs.android.storage.service.IStorageChannelCallback;

/**
 * Responsible for opening up communication channels to/from the storage service for proxy messages.
 *
 * This is not ready to be used yet. It is intended to replace IStorageService.
 *
 * There will be a single instance of an implementation of IStorageServiceNg that can be used to
 * communicate to all stores by opening a channel for each store. This approach only requires
 * binding to the Android Storage Service once. This is more efficient than the current
 * approach which requires binding to the Android Storage Service for each store.
 */
// TODO(b/162747024): Rename to IStorageService and replace the existing IStorageService
interface IStorageServiceNg {
    /**
     * Opens a channel for sending and receiving {@code ProxyMessageProto} messages for a store
     * with the given options.
     *
     * @param encodedStoreOptions a byte array encoding of a {@link
     *     arcs.android.storage.StoreOptionsProto}
     * @param channelCallback invoked when the storage channel has been created
     * @param messageCallback invoked whenever the storage channel responds with a message
     */
    oneway void openStorageChannel(
        in byte[] encodedStoreOptions,
        IStorageChannelCallback channelCallback,
        IMessageCallback messageCallback);
}
