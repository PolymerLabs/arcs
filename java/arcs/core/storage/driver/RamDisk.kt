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

import arcs.core.storage.StorageKey
import arcs.core.storage.driver.volatiles.VolatileMemory
import arcs.core.storage.driver.volatiles.VolatileMemoryImpl
import kotlinx.atomicfu.atomic

/** Singleton, for maintaining a single [VolatileMemory] reference to be shared across all arcs. */
object RamDisk {
  private val _memory = atomic<VolatileMemory>(VolatileMemoryImpl())

  var memory: VolatileMemory
    set(value) { _memory.value = value }
    get() = _memory.value

  suspend fun addListener(listener: (StorageKey, Any?) -> Unit) =
    memory.addListener(listener)

  suspend fun removeListener(listener: (StorageKey, Any?) -> Unit) =
    memory.removeListener(listener)

  /** Clears every piece of data from the [RamDisk] memory. */
  suspend fun clear() {
    val previousMemory = memory
    memory = VolatileMemoryImpl()
    previousMemory.clear()
  }
}
