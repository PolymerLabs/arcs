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

/**
* Mechanism allowing an asynchronous response from the [StorageServiceManager]
* for hard references removals.
*/
interface IHardReferencesRemovalCallback {
    /**
     * A signal that the removal was successful.
     *
     * @param numRemoved the number of top level entities removed.
     */
    oneway void onSuccess(in long numRemoved);

    /**
     * A signal that an error occurred during the operation.
     *
     * @param exception will be a [arcs.android.crdt.CrdtExceptionProto]
     *  serialized to bytes. This should never be `null`.
     */
    oneway void onFailure(in byte[] exception);
}
