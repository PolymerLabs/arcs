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
 * Used to test resurrection capability in core.
 */
class TestingResurrector : Resurrector {
    val arcIdToStorageKeys = ConcurrentHashMap<String, List<StorageKey>>()
    var callback: ResurrectorCallback? = null

    override fun requestResurrection(arcId: String, storageKeys: List<StorageKey>) {
        arcIdToStorageKeys[arcId] = storageKeys
    }

    override fun cancelResurrection(arcId: String) {
        arcIdToStorageKeys.remove(arcId)
    }

    override fun onResurrection(block: ResurrectorCallback) {
        callback = block
    }

    override fun onResurrectedInternal(keys: List<StorageKey>) {
        arcIdToStorageKeys.filter { (arcId, list) ->
            list.any { keys.contains(it) }
        }.forEach { (arcId, storageKeys) ->
            callback?.invoke(arcId, storageKeys)
        }
    }
}
