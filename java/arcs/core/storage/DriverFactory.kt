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

import kotlin.reflect.KClass
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

/** Factory with which to register and retrieve [Driver]s. */
object DriverFactory {
    private var providers = atomic(setOf<DriverProvider>())

    /**
     * Determines if a [DriverProvdier] has been registered which will support data at a given
     * [storageKey].
     */
    fun willSupport(storageKey: StorageKey): Boolean =
        providers.value.any { it.willSupport(storageKey) }

    /**
     * Fetches a [Driver] of type [Data] given its [storageKey].
     */
    suspend inline fun <reified Data : Any> getDriver(
        storageKey: StorageKey
    ): Driver<Data>? = getDriver(storageKey, Data::class)

    /**
     * Fetches a [Driver] of type [Data] (declared by [dataClass]) given its [storageKey].
     */
    suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        dataClass: KClass<Data>
    ): Driver<Data>? {
        return providers.value
            .find { it.willSupport(storageKey) }
            ?.getDriver(storageKey, dataClass)
    }

    /** Registers a new [DriverProvider]. */
    fun register(driverProvider: DriverProvider) = providers.update { it + setOf(driverProvider) }

    /** Unregisters a [DriverProvider]. */
    fun unregister(driverProvider: DriverProvider) = providers.update { it - setOf(driverProvider) }

    /** Reset the driver registration to an empty set. For use in tests only. */
    fun clearRegistrations() = providers.lazySet(setOf())
}

/** Provider of information on the [Driver] and characteristics of the storage behind it. */
interface DriverProvider {
    /** Returns whether or not the driver will support data keyed by the [storageKey]. */
    fun willSupport(storageKey: StorageKey): Boolean

    /** Gets a [Driver] for the given [storageKey] and type [Data] (declared by [dataClass]). */
    suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        dataClass: KClass<Data>
    ): Driver<Data>
}
