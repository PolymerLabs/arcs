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

package arcs.core.common

/** An identifier for a [Referencable]. */
typealias ReferenceId = String

/** Represents a referencable object, ie. one which can be referenced by a unique [id]. */
interface Referencable {
    /** Unique identifier of the Referencable object. */
    val id: ReferenceId

    /** Creation timestamp (in millis) on the Referencable object. */
    var creationTimestamp: Long
        get() = TODO("not implemented")
        set(@Suppress("UNUSED_PARAMETER") value) = TODO("not implemented")

    /** Expiration timestamp (in millis) on the Referencable object. */
    var expirationTimestamp: Long
        get() = TODO("not implemented")
        set(@Suppress("UNUSED_PARAMETER") value) = TODO("not implemented")

    /**
     * If the implementation of [Referencable] supports it, this function returns a realized-version
     * of the referencable.
     */
    fun unwrap(): Referencable = this
}
