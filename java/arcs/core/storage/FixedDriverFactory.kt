package arcs.core.storage

import arcs.core.type.Type
import kotlin.reflect.KClass
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

class FixedDriverFactory(
  private val providers: Set<DriverProvider>
) : DriverFactory {
  override fun willSupport(storageKey: StorageKey): Boolean {
    return providers.any { it.willSupport(storageKey) }
  }

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>,
    type: Type
  ): Driver<Data>? {
    return providers
      .find { it.willSupport(storageKey) }
      ?.getDriver(storageKey, dataClass, type)
  }

  override suspend fun removeAllEntities() {
    coroutineScope {
      launch {
        providers.forEach { it.removeAllEntities() }
      }
    }
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    coroutineScope {
      launch {
        providers.forEach {
          it.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
        }
      }
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
}
