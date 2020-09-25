package arcs.core.storage.driver.volatiles

import arcs.core.storage.StorageKey
import arcs.core.util.Random

/**
 * Lookup map of storage keys to entries, with a [token] that gets updated when data has changed.
 */
class VolatileMemoryImpl : VolatileMemory {
  private val lock = Any()
  private val entries = mutableMapOf<StorageKey, VolatileEntry<*>>()
  private val listeners = mutableSetOf<(StorageKey, Any?) -> Unit>()

  override var token: String = Random.nextInt().toString()
    get() = synchronized(lock) { field }
    private set(value) = synchronized(lock) { field = value }

  override suspend fun contains(key: StorageKey): Boolean =
    synchronized(lock) { key in entries }

  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> get(key: StorageKey): VolatileEntry<Data>? =
    synchronized(lock) { entries[key] as VolatileEntry<Data>? }

  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> set(
    key: StorageKey,
    value: VolatileEntry<Data>
  ): VolatileEntry<Data>? = synchronized(lock) {
    val originalValue = entries[key]
    entries[key] = value
    token = Random.nextInt().toString()
    listeners.forEach { it(key, value.data) }
    return originalValue as VolatileEntry<Data>?
  }

  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> update(
    key: StorageKey,
    updater: (VolatileEntry<Data>?) -> VolatileEntry<Data>
  ): Pair<Boolean, VolatileEntry<Data>> = synchronized(lock) {
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
    isChanged to newEntry
  }

  override suspend fun clear() = synchronized(lock) { entries.clear() }

  override suspend fun addListener(listener: (StorageKey, Any?) -> Unit) =
    synchronized<Unit>(lock) { listeners.add(listener) }

  override suspend fun removeListener(listener: (StorageKey, Any?) -> Unit) =
    synchronized<Unit>(lock) { listeners.remove(listener) }
}
