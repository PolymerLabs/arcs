package arcs.core.storage.testutil

import arcs.core.storage.Driver
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import kotlin.reflect.KClass

/**
 * A fake [DriverProvider] for simple test cases.
 *
 * It will create a [DriverProvider] that will return the [Driver] associated with a [StorageKey]
 * in the provided list of map entries.
 *
 * If you would prefer to automatically construct a [FakeDriver] for each [StorageKey] that
 * is provided, use [FakeDriverVendor] instead.
 */
open class FakeDriverProvider(
  vararg entries: Pair<StorageKey, Driver<*>>
) : DriverProvider {

  val storageKeys = entries.map { it.first }
  val drivers = entries.toMap()

  // This can be set by tests to control the behavior of removeAllEntities
  var onRemoveAllEntities: (suspend () -> Unit)? = null

  // This can be set by tests to control the behavior of removeAllEntitiesCreatedBetween
  var onRemoveEntitiesCreatedBetween: (suspend (Long, Long) -> Unit)? = null

  override fun willSupport(storageKey: StorageKey): Boolean = storageKey in storageKeys

  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data> {
    require(storageKey in storageKeys)
    return drivers[storageKey] as Driver<Data>
  }

  override suspend fun removeAllEntities() {
    onRemoveAllEntities?.invoke()
  }

  override suspend fun removeEntitiesCreatedBetween(
    startTimeMillis: Long,
    endTimeMillis: Long
  ) {
    onRemoveEntitiesCreatedBetween?.invoke(startTimeMillis, endTimeMillis)
  }
}

/**
 * A fake [DriverProvider] for simple test cases.
 *
 * It will return a new [FakeDriver] for each [StorageKey] that [getDriver] is invoked with.
 *
 * If you would prefer to configure a set of known [StorageKey]s and an explicit [Driver] for
 * each one, use [FakeDriverProvider] instead.
 */
class FakeDriverVendor() : FakeDriverProvider() {
  @Suppress("UNCHECKED_CAST")
  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data> = FakeDriver<Data>(storageKey, dataClass)

  override fun willSupport(storageKey: StorageKey): Boolean = true
}
