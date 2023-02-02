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
package arcs.core.storage

import arcs.core.type.Type
import kotlin.reflect.KClass

interface DriverFactory : ExternalStorageOps {
  /**
   * Fetches a [Driver] of type [Data] (declared by [dataClass]) given its [storageKey].
   */
  suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>,
    type: Type
  ): Driver<Data>?

  /**
   * Returns true if this [DriverFactory] has a driver supporting a given [StorageKey].
   */
  fun willSupport(storageKey: StorageKey): Boolean

  /**
   * Clears all entities. Note that not all drivers will update the corresponding Stores (volatile
   * memory ones don't), so after calling this method one should create new Store/StorageProxy
   * instances. Therefore using this method requires shutting down all arcs, and should be use
   * only in rare circumstances.
   */
  suspend fun removeAllEntities()

  /**
   * Clears all entities created in the given time range. See comments on [removeAllEntities] re
   * the need to recreate stores after calling this method.
   */
  suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long)

  /**
   * Gets total entities stored in all providers.
   *
   * @param inMemory if true, return count of entities stored in-memory, otherwise return count
   * of entities stored on-disk.
   */
  override suspend fun getEntitiesCount(inMemory: Boolean): Long

  /**
   * Gets total storage size (bytes) used by all providers.
   *
   * @param inMemory if true, return size stored in-memory, otherwise return size
   * stored on-disk.
   */
  override suspend fun getStorageSize(inMemory: Boolean): Long

  /**
   * Returns if any of the provider's storage is too large, i.e. the storage used by this driver
   * is larger than a threshold.
   */
  suspend fun isStorageTooLarge(): Boolean
}

/**
 * Fetches a [Driver] of type [Data] given its [storageKey].
 */
suspend inline fun <reified Data : Any> DriverFactory.getDriver(
  storageKey: StorageKey,
  type: Type
): Driver<Data>? = getDriver(storageKey, Data::class, type)
