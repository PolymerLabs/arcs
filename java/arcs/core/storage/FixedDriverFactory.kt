package arcs.core.storage

import arcs.core.common.collectExceptions
import kotlin.reflect.KClass

/**
 * An implementation of [DriverFactory] that wraps an immutable list of [DriverProvider].
 *
 * @param providers the providers available. They should be provided in priority order. In cases
 *    where multiple [DriverProvider]s in the list will support the provided the storage key, the
 *    first will be chosen.
 */
class FixedDriverFactory(
  private val providers: List<DriverProvider>
) : DriverFactory {
  constructor(vararg providers: DriverProvider) : this(providers.asList())

  override fun willSupport(storageKey: StorageKey): Boolean {
    return providerForStorageKey(storageKey) != null
  }

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data>? {
    return providerForStorageKey(storageKey)
      ?.getDriver(storageKey, dataClass)
  }

  override suspend fun removeAllEntities() {
    providers.collectExceptions {
      it.removeAllEntities()
    }
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    providers.collectExceptions {
      it.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
    }
  }

  override suspend fun getEntitiesCount(inMemory: Boolean): Long {
    return providers.map { it.getEntitiesCount(inMemory) }.sum()
  }

  override suspend fun getStorageSize(inMemory: Boolean): Long {
    return providers.map { it.getStorageSize(inMemory) }.sum()
  }

  override suspend fun isStorageTooLarge(): Boolean {
    return providers.any { it.isStorageTooLarge() }
  }

  /**
   * Find the first provider that supports a given storage key. Used as a consistent
   * provider-finder for [willSupport] and [getDriver].
   */
  private fun providerForStorageKey(storageKey: StorageKey): DriverProvider? {
    return providers.firstOrNull { it.willSupport(storageKey) }
  }
}
