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
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/** Factory with which to register and retrieve [Driver]s. */
object DefaultDriverFactory : DriverFactory {
  private var providers = atomic(setOf<DriverProvider>())

  /**
   * Determines if a [DriverProvider] has been registered which will support data at a given
   * [storageKey].
   */
  fun willSupport(storageKey: StorageKey): Boolean =
    providers.value.any { it.willSupport(storageKey) }

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>,
    type: Type
  ): Driver<Data>? {
    return providers.value
      .find { it.willSupport(storageKey) }
      ?.getDriver(storageKey, dataClass, type)
  }

  override suspend fun removeAllEntities() {
    coroutineScope {
      launch {
        providers.value.forEach { it.removeAllEntities() }
      }
    }
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    coroutineScope {
      launch {
        providers.value.forEach {
          it.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
        }
      }
    }
  }

  override suspend fun getEntitiesCount(inMemory: Boolean): Long =
    providers.value.map { it.getEntitiesCount(inMemory) }.sum()

  override suspend fun getStorageSize(inMemory: Boolean): Long =
    providers.value.map { it.getStorageSize(inMemory) }.sum()

  override suspend fun isStorageTooLarge(): Boolean =
    providers.value.filter { it.isStorageTooLarge() }.any()

  /** Registers a new [DriverProvider]. */
  fun register(driverProvider: DriverProvider) = providers.update { it + setOf(driverProvider) }

  /** Unregisters a [DriverProvider]. */
  fun unregister(driverProvider: DriverProvider) = providers.update { it - setOf(driverProvider) }

  /** Reset the driver registration to an empty set. For use in tests only. */
  fun clearRegistrations() = providers.lazySet(setOf())
}
