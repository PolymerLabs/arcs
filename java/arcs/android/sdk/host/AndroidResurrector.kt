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
package arcs.android.sdk.host

import android.app.Service
import arcs.core.host.Resurrector
import arcs.core.host.ResurrectorCallback
import arcs.core.storage.StorageKey
import arcs.sdk.android.storage.ResurrectionHelper
import java.util.concurrent.ConcurrentHashMap

/**
 * An implementation of [Resurrector] that is backed by [AndroidResurrector]. This implementation
 * currently has limitations, in that it does not persist the arcId to storageKey mappings, but
 * uses memory resident maps. This is a workaround until [ResurrectorService] is upgraded to
 * support this feature.
 */
class AndroidResurrector(val context: Service) : Resurrector {
    val resurrectionHelper: ResurrectionHelper = ResurrectionHelper(
        context, ::onResurrectedInternal
    )

    /**
     * This is a hack until [ResurrectionService] can allow us to register per-arcId subscriptions.
     * Right now, there's no way to associate extra info (e.g. arcId) with a subscription
     * (list of keys), you can only associate it with the [Service] class as a whole.
     */
    val arcIdToStorageKeys = ConcurrentHashMap<String, List<StorageKey>>()
    var callback: ResurrectorCallback? = null

    override fun requestResurrection(arcId: String, storageKeys: List<StorageKey>) {
        arcIdToStorageKeys[arcId] = storageKeys
        resurrectionHelper.requestResurrection(storageKeys, context::class.java)
    }

    override fun cancelResurrection(arcId: String) {
        arcIdToStorageKeys.remove(arcId)
        if (arcIdToStorageKeys.isEmpty()) {
            /*
             * No affordance is made just to cancel a subscription to an arcId/storageKeys in the
             * current ResurrectorService :(
             */
            resurrectionHelper.cancelResurrectionRequest(context::class.java)
        }
    }

    override fun onResurrection(block: ResurrectorCallback) {
        callback = block
    }

    /**
     * Find the arcId associated with the updated keys. An arcId is resurrected if
     * even one of its keys of interested is in the [keys] list.
     */
    override fun onResurrectedInternal(keys: List<StorageKey>) {
        arcIdToStorageKeys.filter { (arcId, list) ->
            list.any { keys.contains(it) }
        }.forEach { (arcId, storageKeys) ->
            callback?.invoke(arcId, storageKeys)
        }
    }
}

