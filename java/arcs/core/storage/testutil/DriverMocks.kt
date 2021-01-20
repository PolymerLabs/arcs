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

package arcs.core.storage.testutil

import arcs.core.storage.Driver
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import kotlin.reflect.KClass

class MockDriverProvider : DriverProvider {
  override fun willSupport(storageKey: StorageKey): Boolean = true

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data> = MockDriver(storageKey, dataClass)

  override suspend fun removeAllEntities() = Unit

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) =
    Unit
}

class MockDriver<T : Any>(
  override val storageKey: StorageKey,
  override val dataClass: KClass<T>
) : Driver<T> {
  override var token: String? = null
  var receiver: (suspend (data: T, version: Int) -> Unit)? = null
  var sentData = mutableListOf<T>()
  var lastVersion = -1
  var fail = false

  override suspend fun registerReceiver(
    token: String?,
    receiver: suspend (data: T, version: Int) -> Unit
  ) {
    this.token = token
    this.receiver = receiver
    if (sentData.size > 0) {
      receiver(sentData.last(), lastVersion)
    }
  }

  override suspend fun send(data: T, version: Int): Boolean {
    sentData.add(data)
    lastVersion = version
    return !fail
  }

  override suspend fun clone(): MockDriver<T> {
    val newDriver = MockDriver(storageKey, dataClass)
    newDriver.sentData = sentData
    newDriver.lastVersion = lastVersion
    return newDriver
  }
}
