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
import java.util.concurrent.ConcurrentHashMap

/**
 * Base implementation of [Resurrector].
 */
open class ResurrectorBase : Resurrector {
    protected val arcIdToStorageKeys = ConcurrentHashMap<String, List<StorageKey>>()
    private var callbacks = mutableMapOf<String, ResurrectorCallback>()

    override fun requestResurrection(arcId: String, storageKeys: List<StorageKey>) {
        arcIdToStorageKeys[arcId] = storageKeys
    }

    override fun cancelResurrection(arcId: String) {
        arcIdToStorageKeys.remove(arcId)
    }

    override fun onResurrection(hostId: String, block: ResurrectorCallback) {
        callbacks[hostId] = block
    }

    /**
     * Find the arcId associated with the updated keys. An arcId is resurrected if
     * even one of its keys of interested is in the [keys] list.
     */
    override fun onResurrectedInternal(keys: List<StorageKey>) {
        arcIdToStorageKeys.filter { (_, list) ->
            list.any { keys.contains(it) }
        }.forEach { (arcId, storageKeys) ->
            callbacks.values.forEach { it(arcId, storageKeys) }
        }
    }
}
