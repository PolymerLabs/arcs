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

package arcs.android.storage.service

import arcs.core.host.ArcHostManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.DatabaseDriverProvider
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch

/**
 * A [StorageServiceManager] is used by a client of the [StorageService] to manage
 * data stored within the [StorageService].
 */
@ExperimentalCoroutinesApi
class DevToolsStorageManager(
    /** [CoroutineContext] on which to build one specific to this [StorageServiceManager]. */
    parentCoroutineContext: CoroutineContext,
    /** The stores managed by StorageService. */
    val stores: ConcurrentHashMap<StorageKey, DeferredStore<*, *, *>>
) : IDevToolsStorageManager.Stub() {

    override fun getStorageKeys() : String {
        var rtn = ""
        stores.forEach() { key, store ->
            rtn = rtn + key.toKeyString() + ", "
        }
        return rtn
    }
}
