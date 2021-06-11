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

import arcs.core.crdt.CrdtEntity
import arcs.core.data.EntityType
import arcs.core.entity.Entity
import arcs.core.entity.Handle
import arcs.core.storage.DefaultDriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

/**
 * Returns when the given storage key has been updated in storage.
 */
@OptIn(ExperimentalCoroutinesApi::class)
suspend fun waitForKey(
  storageKey: StorageKey,
  type: EntityType,
  dataClass: KClass<*> = CrdtEntity.Data::class
) {
  // Data could be already there (or not) by the time we register the receiver, registerReceiver
  // will call back with the data in any case.
  withContext(CoroutineScope(Dispatchers.Default).coroutineContext) {
    val driver = DefaultDriverFactory.get().getDriver(storageKey, dataClass, type)!!
    suspendCancellableCoroutine<Unit> { continuation ->
      launch {
        driver.registerReceiver { _, _ ->
          if (continuation.isActive) {
            continuation.resume(Unit) {}
            // Unregister by registering an empty receiver, as not all drivers implement close.
            driver.registerReceiver { _, _ -> }
            driver.close()
          }
        }
      }
    }
  }
}

/**
 * Returns when the given [entity], which needs to be stored in the given [handle] has been updated
 * in storage.
 */
suspend fun waitForEntity(handle: Handle, entity: Entity, type: EntityType) {
  val entityId =
    checkNotNull(entity.entityId) { "Can only wait for stored entities with an entity ID." }
  val entityKey =
    (handle.getProxy().storageKey as ReferenceModeStorageKey).backingKey.newKeyWithComponent(
      entityId
    )
  waitForKey(entityKey, type, CrdtEntity.Data::class)
}
