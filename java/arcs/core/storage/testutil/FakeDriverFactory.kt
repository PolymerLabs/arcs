/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.storage.testutil

import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import kotlin.reflect.KClass

/** [FakeDriverFactory] is used to control what [Driver] is returned in tests. */
@Suppress("UNCHECKED_CAST")
class FakeDriverFactory(val driver: Driver<*>) : DriverFactory {
  var getDriverCalls: Int = 0

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data> {
    getDriverCalls++
    return driver as Driver<Data>
  }

  override fun willSupport(storageKey: StorageKey): Boolean = true

  override suspend fun removeAllEntities() = Unit

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) =
    Unit

  override suspend fun getEntitiesCount(inMemory: Boolean): Long = 0L

  override suspend fun getStorageSize(inMemory: Boolean): Long = 0L

  override suspend fun isStorageTooLarge(): Boolean = false
}
