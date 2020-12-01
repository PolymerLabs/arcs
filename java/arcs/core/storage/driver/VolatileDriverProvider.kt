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
import arcs.core.storage.driver.volatiles.VolatileDriverImpl
import arcs.core.storage.driver.volatiles.VolatileMemoryImpl
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.type.Type
import kotlin.reflect.KClass

/** [DriverProvider] of [VolatileDriver]s for an arc. */
data class VolatileDriverProvider(private val arcId: ArcId) : DriverProvider {
  private val arcMemory = VolatileMemoryImpl()

  override fun willSupport(storageKey: StorageKey): Boolean =
    storageKey is VolatileStorageKey && storageKey.arcId == arcId

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>,
    type: Type
  ): Driver<Data> {
    require(
      willSupport(storageKey)
    ) { "This provider does not support storageKey: $storageKey" }
    return VolatileDriverImpl.create(storageKey, arcMemory)
  }

  override suspend fun removeAllEntities() = arcMemory.clear()

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) =
    // Volatile storage is opaque, so remove all entities.
    removeAllEntities()
}

/** [DriverProvider] that creates an instance of [VolatileDriverProvider] per arc on demand. */
class VolatileDriverProviderFactory : DriverProvider {
  private val driverProvidersByArcId = mutableMapOf<ArcId, VolatileDriverProvider>()

  /** Returns a set of all known [ArcId]s. */
  val arcIds: Set<ArcId>
    get() = driverProvidersByArcId.keys

  override fun willSupport(storageKey: StorageKey): Boolean {
    if (storageKey !is VolatileStorageKey) return false
    // Register a new VolatileDriverProvider, if the arcId hasn't been seen before.
    if (storageKey.arcId !in driverProvidersByArcId) {
      driverProvidersByArcId[storageKey.arcId] = VolatileDriverProvider(storageKey.arcId)
    }
    return true
  }

  /** Gets a [Driver] for the given [storageKey] and type [Data] (declared by [dataClass]). */
  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>,
    type: Type
  ): Driver<Data> {
    require(storageKey is VolatileStorageKey) {
      "Unexpected non-volatile storageKey: $storageKey"
    }
    require(willSupport(storageKey)) {
      "This provider does not support storageKey: $storageKey"
    }
    return driverProvidersByArcId[storageKey.arcId]!!.getDriver(storageKey, dataClass, type)
  }

  override suspend fun removeAllEntities() {
    driverProvidersByArcId.values.forEach { it.removeAllEntities() }
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    driverProvidersByArcId.values.forEach {
      it.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
    }
  }

  override suspend fun getEntitiesCount(inMemory: Boolean): Long {
    return driverProvidersByArcId.values.fold(0L) { sum, provider ->
      sum + provider.getEntitiesCount(inMemory)
    }
  }
}
