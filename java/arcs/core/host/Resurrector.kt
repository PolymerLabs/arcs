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
package arcs.core.host

import arcs.core.storage.StorageKey

typealias ResurrectorCallback = (String, List<StorageKey>) -> Unit

/**
 * A [Resurrector] is supplied by the embedder (e.g. [Service]) of an [ArcHost] as a mechanism for
 * requesting, or cancelling resurrection, as well as processing calls for resurrection.
 */
interface Resurrector {
    /**
     * Issue a request to be resurrected by a resurrection service whenever the data identified by
     * the provided [storageKeys] changes.
     */
    fun requestResurrection(arcId: String, storageKeys: List<StorageKey>) = Unit

    /** Cancel resurrection registrations for the given [arcId]. */
    fun cancelResurrection(arcId: String) = Unit

    /**
     * Registers a callback to be called by the resurrection service whenever the [affectedKeys]
     * have been updated.
     */
    fun onResurrection(block: ResurrectorCallback) = Unit

    // VisibleForTesting
    /**
     * Triggers resurrection for the given [keys].
     */
    fun onResurrectedInternal(keys: List<StorageKey>) = Unit
}
