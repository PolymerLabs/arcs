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
abstract class BaseHandle(
    override val name: String,
    private val storageProxy: StorageProxy<*, *, *>
) : Handle {
    override suspend fun onSync(action: () -> Unit) = storageProxy.addOnSync(name, action)

    override suspend fun onDesync(action: () -> Unit) = storageProxy.addOnDesync(name, action)

    override suspend fun close() = storageProxy.removeCallbacksForName(name)
}
