package arcs.core.storage.driver.testutil

import arcs.core.storage.Driver
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.volatiles.VolatileDriverImpl
import arcs.core.storage.driver.volatiles.VolatileEntry
import arcs.core.storage.driver.volatiles.VolatileMemory
import arcs.core.storage.driver.volatiles.VolatileMemoryImpl
import arcs.core.storage.keys.RamDiskStorageKey
import kotlin.reflect.KClass

/**
 * [DriverProvider] implementation which registers itself as capable of handling
 * [RamDiskStorageKey]s, but uses a [SlowVolatileMemory] bound to the instance, rather than a
 * global static [VolatileMemory] (the way it is done for [RamDiskDriverProvider]).
 *
 * Provide a [waitOp] callback to be able to control when an operation is allowed to finish.
 */
class SlowRamDiskDriverProvider(
  waitOp: suspend (SlowVolatileMemory.MemoryOp, StorageKey?) -> Unit
) : DriverProvider {
  val memory = SlowVolatileMemory(waitOp)

  override fun willSupport(storageKey: StorageKey) = storageKey is RamDiskStorageKey

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data> = VolatileDriverImpl.create(storageKey, dataClass, memory)

  override suspend fun removeAllEntities() = Unit

  override suspend fun removeEntitiesCreatedBetween(
    startTimeMillis: Long,
    endTimeMillis: Long
  ) = Unit
}

/**
 * Essentially the same as [VolatileMemoryImpl], except that [waitOp] is used before the operations
 * exposed by [VolatileMemory] (implemented by [VolatileMemoryImpl]) are called - allowing the
 * developer to suspend the calling coroutine until they are ready for the operation to proceed.
 */
@Suppress("UNCHECKED_CAST")
class SlowVolatileMemory(
  private val waitOp: suspend (MemoryOp, StorageKey?) -> Unit
) : VolatileMemory {
  private val delegate = VolatileMemoryImpl()

  override val token: String
    get() = delegate.token

  override suspend fun contains(key: StorageKey): Boolean {
    waitOp(MemoryOp.Contains, key)
    return delegate.contains(key)
  }

  override suspend fun <Data : Any> get(key: StorageKey): VolatileEntry<Data>? {
    waitOp(MemoryOp.Get, key)
    return delegate.get(key)
  }

  override suspend fun <Data : Any> set(
    key: StorageKey,
    value: VolatileEntry<Data>
  ): VolatileEntry<Data>? {
    waitOp(MemoryOp.Set, key)
    return delegate.set(key, value)
  }

  override suspend fun <Data : Any> update(
    key: StorageKey,
    updater: (VolatileEntry<Data>?) -> VolatileEntry<Data>
  ): Pair<Boolean, VolatileEntry<Data>> {
    waitOp(MemoryOp.Update, key)
    return delegate.update(key, updater)
  }

  override suspend fun clear() {
    waitOp(MemoryOp.Clear, null)
    delegate.clear()
  }

  override suspend fun addListener(listener: (StorageKey, Any?) -> Unit) {
    delegate.addListener(listener)
  }

  override suspend fun removeListener(listener: (StorageKey, Any?) -> Unit) {
    delegate.removeListener(listener)
  }

  /**
   * Type of operation which was performed. Passed to the delaySource callback associated with a
   * [SlowVolatileMemory].
   */
  enum class MemoryOp {
    Contains, Get, Set, Update, Clear
  }
}
