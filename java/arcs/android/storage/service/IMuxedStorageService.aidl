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
import arcs.android.storage.service.IStorageChannelCallback;

/**
 * Responsible for opening up communication channels to/from the storage service for "muxed" proxy
 * messages, i.e. proxy messages that need to be subsequently routed to other stores.
 */
// TODO(b/162747024): Rename to IStorageService, and replace the existing IStorageService with a new
// openStorageChannel method in this interface.
interface IMuxedStorageService {
    /**
     * Opens a channel for sending and receiving {@code MuxedProxyMessageProto} messages for a store
     * muxer with the given options.
     *
     * @param encodedStoreOptions a byte array encoding of a {@link
     *     arcs.android.storage.StoreOptionsProto}
     * @param callback invoked whenever the storage channel responds with a
     *     message
     */
    IStorageChannel openMuxedStorageChannel(
        in byte[] encodedStoreOptions, IStorageChannelCallback callback);
}
