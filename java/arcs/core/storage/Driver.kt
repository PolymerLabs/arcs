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

package arcs.core.storage

/**
 * Interface that all drivers must support.
 *
 * Note the threading of a version number here; each model provided by the [Driver] to the [Store]
 * (using a receiver registered with [registerReceiver]) is paired with a version, as is each model
 * sent from the [Store] to the driver (using [send]).
 *
 * This threading is used to track whether driver state has changed while the [Store] is processing
 * a particular model. [send] should always fail if the version isn't exactly `1` greater than the
 * current internal version.
 */
interface Driver<Data : Any> {
    /** Key identifying the [Driver]. */
    val storageKey: StorageKey

    /**
     * Returns a token that represents the current state of the data.
     *
     * This can be provided to [registerReceiver], and will impact what data is delivered on
     * initialization (only "new" data should be delivered, though note that this can be satisfied
     * by sending a model for merging rather than by remembering a set of ops).
     */
    val token: String?

    /** Registers a listener for [Data]. */
    suspend fun registerReceiver(
        token: String? = null,
        receiver: suspend (data: Data, version: Int) -> Unit
    )

    /** Sends data to the [Driver] for storage. */
    suspend fun send(data: Data, version: Int): Boolean
}
