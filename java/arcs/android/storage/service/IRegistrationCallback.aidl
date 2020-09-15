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
interface IRegistrationCallback {
    /**
     * A signal that callback registration was successful.
     *
     * @param token A token unique the the registered callback that can be
     * used to later unregister the callback.
     */
    oneway void onSuccess(in int token);

    /**
     * A signal that an error occurred during callback registration.
     *
     * @param exception will be a {@link arcs.android.crdt.CrdtExceptionProto}
     *  serialized to bytes. This should never be null.
     */
    oneway void onFailure(in byte[] exception);
}
