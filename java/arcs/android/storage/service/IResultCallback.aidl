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

/** Mechanism allowing an asynchronous response from the StorageService. */
interface IResultCallback {
    /**
     * Called to signal a successful/erroneous result from the StorageService or ServiceStore.
     *
     * @param exception will be {@code null} when the result indicates success. Otherwise, will be
     *     a {@link arcs.android.crdt.CrdtExceptionProto} serialized to bytes.
     */
    oneway void onResult(in byte[] exception);
}
