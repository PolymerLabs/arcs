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

package arcs.core.storage.driver

import arcs.core.common.ArcId
import arcs.core.storage.Driver
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.volatiles.VolatileDriver
import arcs.core.storage.driver.volatiles.VolatileDriverImpl
import arcs.core.storage.driver.volatiles.VolatileMemory
import arcs.core.storage.driver.volatiles.VolatileMemoryImpl
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.util.TaggedLog
import arcs.core.util.guardedBy
import kotlin.reflect.KClass
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * [DriverProvider] that creates an instance of [VolatileDriverProvider] per arc on demand.
 *
 * [VolatileDriver] instances for the same [StorageKey] will share the same underlying
 * [VolatileMemory] as long as one [VolatileDriver] instance is open. See [getDriver] for more
 * details.
 */
class VolatileDriverProvider : DriverProvider {
  private val arcMemoryMutex = Mutex()
  private val arcMemories by guardedBy(
    arcMemoryMutex,
    mutableMapOf<ArcId, VolatileMemoryRecord>()
  )

  private val log = TaggedLog { "VolatileDriverProvider" }

  override fun willSupport(storageKey: StorageKey): Boolean {
    return storageKey is VolatileStorageKey
  }

  /**
   * Gets a [Driver] for the given [storageKey] and type [Data] (declared by [dataClass]).
   *
   * The first time a driver is requested for a given [StorageKey] using the [getDriver] method, a
   * new [VolatileMemory] instance will be created and stored in a map maintained by this provider.
   * As long as there is at least one active [VolatileDriver] for the [StorageKey] (that is, one or
   * more of the [VolatileDriver] instances have not yet had their [close] method called), the
   * [VolatileMemory] instance will remain in the map. When the number of active drivers for a given
   * [StorageKey] goes to 0, the [VolatileMemory] instance will be removed from the map (it will
   * still be retained by any [VolatileDriver] instances that are live, though.) A subsequent call
   * to [getDriver] for that same [StorageKey] will result in a new instance being created.
   */
  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data> {
    require(storageKey is VolatileStorageKey) {
      "Expected VolatileStorageKey, got ${storageKey::class.simpleName}"
    }
    return arcMemoryMutex.withLock {
      val arcMemoryRecord = arcMemories.getOrPut(storageKey.arcId) {
        VolatileMemoryRecord(VolatileMemoryImpl())
      }
      val driver = VolatileDriverImpl.create<Data>(
        storageKey,
        arcMemoryRecord.memory,
        onClose = { deactivateDriverOrLogWarning(it) }
      )
      arcMemoryRecord.activeDrivers += driver
      driver
    }
  }

  private suspend fun deactivateDriverOrLogWarning(driver: VolatileDriver<*>) {
    try {
      deactivateDriver(driver)
    } catch (e: IllegalStateException) {
      log.warning(e) { "VolatileDriver.onClose deactivation issue:" }
    }
  }

  private suspend fun deactivateDriver(driver: VolatileDriver<*>) {
    // TODO(b/174680121) Fix typing so that we don't need a cast here.
    val arcId = (driver.storageKey as VolatileStorageKey).arcId

    arcMemoryMutex.withLock {
      val memoryRecord = checkNotNull(arcMemories[arcId]) {
        "ArcId is not present in tracked memories."
      }

      val driverExisted = memoryRecord.activeDrivers.remove(driver)
      check(driverExisted) {
        "Driver is not present in active list for ArcId."
      }

      if (memoryRecord.activeDrivers.isEmpty()) {
        arcMemories.remove(arcId)
      }
    }
  }

  override suspend fun removeAllEntities() {
    arcMemoryMutex.withLock {
      arcMemories.values.forEach { it.memory.clear() }
    }
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    removeAllEntities()
  }

  private data class VolatileMemoryRecord(
    val memory: VolatileMemory,
    val activeDrivers: MutableSet<VolatileDriver<*>> = mutableSetOf()
  )
}
