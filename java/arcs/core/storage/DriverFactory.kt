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

import arcs.core.type.Type
import kotlin.reflect.KClass
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.supervisorScope

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
        storageKey: StorageKey,
        type: Type
    ): Driver<Data>? = getDriver(storageKey, Data::class, type)

    /**
     * Fetches a [Driver] of type [Data] (declared by [dataClass]) given its [storageKey].
     */
    suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        dataClass: KClass<Data>,
        type: Type
    ): Driver<Data>? {
        return providers.value
            .find { it.willSupport(storageKey) }
            ?.getDriver(storageKey, dataClass, type)
    }

    /**
     * Clears all entities. Note that not all drivers will update the corresponding Stores (volatile
     * memory ones don't), so after calling this method one should create new Store/StorageProxy
     * instances. Therefore using this method requires shutting down all arcs, and should be use
     * only in rare circumstances.
     *
     * If removal fails for any of the providers, it will be included as a map entry in the
     * returned [OperationFailures] map.
     */
    suspend fun removeAllEntities(): Collection<OperationFailure> = runSafelyOnAllProviders {
        it.removeAllEntities()
    }

    /**
     * Clears all entities created in the given time range. See comments on [removeAllEntities] re
     * the need to recreate stores after calling this method.
     *
     * If removal fails for any of the providers, it will be included as a map entry in the
     * returned [OperationFailures] map.
     */
    suspend fun removeEntitiesCreatedBetween(
        startTimeMillis: Long,
        endTimeMillis: Long
    ): Collection<OperationFailure> = runSafelyOnAllProviders {
        it.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
    }

    /** Registers a new [DriverProvider]. */
    fun register(driverProvider: DriverProvider) = providers.update { it + setOf(driverProvider) }

    /** Unregisters a [DriverProvider]. */
    fun unregister(driverProvider: DriverProvider) = providers.update { it - setOf(driverProvider) }

    /** Reset the driver registration to an empty set. For use in tests only. */
    fun clearRegistrations() = providers.lazySet(setOf())

    /**
     * A helper to launch a particle task on all registered providers.
     *
     * If any of the jobs throws an exception, it will not stop any of the other jobs or
     * propagate upwards.
     *
     * Any failures will be represented as an [OperationFailure] in the returned collection.
     */
    private suspend fun runSafelyOnAllProviders(
        block: suspend (DriverProvider) -> Unit
    ): Collection<OperationFailure> = supervisorScope {
        providers.value
            .map { driverProvider ->
                async {
                    try {
                        block(driverProvider)
                        null
                    } catch (throwable: Throwable) {
                        OperationFailure(driverProvider, throwable)
                    }
                }
            }
            .awaitAll()
            .filterNotNull()
    }
}

/** A collection of [OperationFailure] is returned to indicate any failures in batch operations. */
data class OperationFailure(val driverProvider: DriverProvider, val throwable: Throwable)

/** Provider of information on the [Driver] and characteristics of the storage behind it. */
interface DriverProvider {
    /** Returns whether or not the driver will support data keyed by the [storageKey]. */
    fun willSupport(storageKey: StorageKey): Boolean

    /** Gets a [Driver] for the given [storageKey] and type [Data] (declared by [dataClass]). */
    suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        dataClass: KClass<Data>,
        type: Type
    ): Driver<Data>

    // TODO: once all DriverProviders implement this, we can remove these defaults.
    suspend fun removeAllEntities() = Unit

    suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) = Unit
}
