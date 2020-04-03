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
package arcs.core.entity

import arcs.core.storage.StorageProxy

/** Base functionality common to all read/write singleton and collection handles. */
abstract class BaseHandle<T : Entity>(
    override val name: String,
    protected val spec: HandleSpec<T>,
    private val storageProxy: StorageProxy<*, *, *>
) : Handle {
    protected var closed = false

    override suspend fun onReady(action: () -> Unit) = storageProxy.addOnReady(name, action)

    protected inline fun <T> checkPreconditions(block: () -> T): T {
        check(!closed) { "Handle $name is closed" }
        return block()
    }

    override suspend fun close() {
        closed = true
        storageProxy.removeCallbacksForName(name)
    }
}
