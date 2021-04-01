package arcs.core.storage.driver.volatiles

import arcs.core.storage.StorageKey

/**
 * Defines a lookup map of [StorageKey]s to entries, with a [token] that gets updated when data
 * has been changed.
 */
interface VolatileMemory {
  /** Current token. Will be updated with every call to [set]. */
  val token: String

  /** Returns whether or not a [VolatileEntry] exists in memory for the [key]. */
  suspend fun contains(key: StorageKey): Boolean

  /**
   * Gets a [VolatileEntry] of type [Data] from the memory stored at [key], or null if not found.
   */
  suspend fun <Data : Any> get(key: StorageKey): VolatileEntry<Data>?

  /**
   * Sets the value at the provided [key] to the given [VolatileEntry] and returns the old value,
   * if a value was previously set.
   */
  suspend fun <Data : Any> set(
    key: StorageKey,
    value: VolatileEntry<Data>
  ): VolatileEntry<Data>?

  /**
   * Updates the value at the given [StorageKey] using the provided callback: [updater] and
   * returns a [Pair] of whether or not the value has been changed from it's previous value, and
   * the result of the callback.
   */
  suspend fun <Data : Any> update(
    key: StorageKey,
    updater: (VolatileEntry<Data>?) -> VolatileEntry<Data>
  ): Pair<Boolean, VolatileEntry<Data>>

  /** Get the number of elements in volatile memory storage. */
  fun countEntries(): Long

  /** Clears everything from storage. */
  suspend fun clear()

  /** Adds a listener which will be triggered whenever an individual stored data point changes. */
  suspend fun addListener(listener: (StorageKey, Any?) -> Unit)

  /** Removes the specified listener from being called when data changes. */
  suspend fun removeListener(listener: (StorageKey, Any?) -> Unit)
}
