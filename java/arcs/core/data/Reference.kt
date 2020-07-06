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

package arcs.core.data

import arcs.core.common.Referencable
import arcs.core.util.CoreDispatchers
import kotlin.coroutines.CoroutineContext

/**
 * A reference to an [Entity] of type [T].
 *
 * References may be "alive" or "dead".
 *
 * * An "alive" [Reference] is one where the [Referencable] it refers to is still accessible via Arcs
 *   storage.
 * * Conversely, a "dead" [Reference] is one whose [Referencable] has been removed from storage by
 *   some means. For example: the [Referencable]'s time-to-live could have elapsed.
 *
 * Developers can check the liveness of a [Reference] using either [isAlive] or [isDead].
 */
interface Reference<T : Referencable> : arcs.core.crdt.CrdtEntity.Reference {
    /**
     * Fetches the actual [Entity] value being referenced from storage.
     *
     * Returns `null` if this [Reference] is no longer alive.
     */
    suspend fun dereference(coroutineContext: CoroutineContext = CoreDispatchers.Default): T?

    /** Returns whether or not the [Entity] being referenced still exists. */
    suspend fun isAlive(coroutineContext: CoroutineContext = CoreDispatchers.Default): Boolean =
        dereference(coroutineContext) != null

    /** Returns whether or not the [Entity] being referenced has been removed from storage. */
    suspend fun isDead(coroutineContext: CoroutineContext = CoreDispatchers.Default): Boolean =
        !isAlive(coroutineContext)
}
