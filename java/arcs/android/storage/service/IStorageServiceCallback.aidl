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

/** Variant of ProxyCallback intended for StorageService communications. */
interface IStorageServiceCallback {
    /** Handles an incoming ProxyMessage. */
    void onProxyMessage(in ParcelableProxyMessage message);
}
