package arcs.core.storage.driver.volatiles

import arcs.core.storage.StorageKey
import arcs.core.util.Random
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Lookup map of storage keys to entries, with a [token] that gets updated when data has changed.
 */
class VolatileMemoryImpl : VolatileMemory {
  private val lock = Mutex()
  private val entries = mutableMapOf<StorageKey, VolatileEntry<*>>()
  private val listeners = mutableSetOf<(StorageKey, Any?) -> Unit>()

  private val _token = atomic(Random.nextInt().toString())

  override var token: String
    get() = _token.value
    private set(value) { _token.getAndSet(value) }

  override suspend fun contains(key: StorageKey): Boolean =
    lock.withLock { key in entries }

  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> get(key: StorageKey): VolatileEntry<Data>? =
    lock.withLock { entries[key] as VolatileEntry<Data>? }

  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> set(
    key: StorageKey,
    value: VolatileEntry<Data>
  ): VolatileEntry<Data>? = lock.withLock {
    val currentEntry: VolatileEntry<Data>? = entries[key] as VolatileEntry<Data>?
    val isChanged = currentEntry != value
    if (isChanged) {
      entries[key] = value
      token = Random.nextInt().toString()
      listeners.forEach {
        it(key, value.data)
      }
    }
    return@withLock currentEntry
  }

  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> update(
    key: StorageKey,
    updater: (VolatileEntry<Data>?) -> VolatileEntry<Data>
  ): Pair<Boolean, VolatileEntry<Data>> = lock.withLock {
    val currentEntry: VolatileEntry<Data>? = entries[key] as VolatileEntry<Data>?
    val newEntry = updater(currentEntry)
    val isChanged = currentEntry != newEntry
    if (isChanged) {
      entries[key] = newEntry
      token = Random.nextInt().toString()
      listeners.forEach {
        it(key, newEntry.data)
      }
    }
    return@withLock isChanged to newEntry
  }

  override suspend fun clear() = lock.withLock { entries.clear() }

  override suspend fun addListener(listener: (StorageKey, Any?) -> Unit) =
    lock.withLock<Unit> { listeners.add(listener) }

  override suspend fun removeListener(listener: (StorageKey, Any?) -> Unit) =
    lock.withLock<Unit> { listeners.remove(listener) }
}
