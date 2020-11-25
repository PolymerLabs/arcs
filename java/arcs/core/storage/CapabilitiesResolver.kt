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

package arcs.core.storage

import arcs.core.common.ArcId
import arcs.core.data.Capabilities
import arcs.core.data.ReferenceType
import arcs.core.data.toSchema
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type

/**
 * [CapabilitiesResolver] is a factory class that creates [StorageKey]s based on the registered
 * providers and given [Capabilities].
 */
class CapabilitiesResolver(
  private val options: Options,
  private val factories: Map<String, StorageKeyFactory>,
  private val selector: FactorySelector = SimpleCapabilitiesSelector()
) {
  constructor(
    options: Options,
    factoriesList: List<StorageKeyFactory> = listOf(),
    selector: FactorySelector = SimpleCapabilitiesSelector()
  ) : this(options, CapabilitiesResolver.getFactoryMap(factoriesList), selector)

  /** Options used to construct [CapabilitiesResolver]. */
  data class Options(val arcId: ArcId)

  fun createStorageKey(capabilities: Capabilities, type: Type, handleId: String): StorageKey {
    val selectedFactories =
      factories.filterValues { it.supports(capabilities) }

    require(!selectedFactories.isEmpty()) {
      "Cannot create storage key for handle '$handleId' with capabilities $capabilities"
    }
    val factory = selector.select(selectedFactories.values)
    return createStorageKeyWithFactory(factory, type, handleId)
  }

  private fun createStorageKeyWithFactory(
    factory: StorageKeyFactory,
    type: Type,
    handleId: String
  ): StorageKey {
    val containerKey = factory.create(
      StorageKeyFactory.ContainerStorageKeyOptions(options.arcId, type.toSchema())
    )
    val containerChildKey = containerKey.childKeyForHandle(handleId)
    if (type is ReferenceType<*>) {
      return containerChildKey
    }
    val backingKey = factory.create(
      StorageKeyFactory.BackingStorageKeyOptions(options.arcId, type.toSchema())
    )
    // ReferenceModeStorageKeys in different drivers can cause problems with garbage collection.
    check(backingKey.protocol == containerKey.protocol) {
      "Backing and containers keys must use same protocol"
    }
    return ReferenceModeStorageKey(backingKey, containerChildKey)
  }

  /**
   * An interface for selecting a factory, if more than one are available for [Capabilities].
   */
  interface FactorySelector {
    fun select(factories: Collection<StorageKeyFactory>): StorageKeyFactory
  }

  /**
   * An implementation of a [FactorySelector] choosing a factory with a least restrictive max
   * [Capabilities] set.
   */
  class SimpleCapabilitiesSelector(
    val sortedProtocols: Array<String> = arrayOf("volatile", "ramdisk", "memdb", "db")
  ) : FactorySelector {
    override fun select(factories: Collection<StorageKeyFactory>): StorageKeyFactory {
      require(factories.isNotEmpty()) { "Cannot select from empty factories list" }
      val compareProtocol = compareBy { protocol: String ->
        val index = sortedProtocols.indexOf(protocol)
        if (index >= 0) {
          index
        } else sortedProtocols.size
      }

      return factories.reduce { acc, factory ->
        if (minOf(acc.protocol, factory.protocol, compareProtocol) == factory.protocol) {
          factory
        } else acc
      }
    }
  }

  companion object {
    private val defaultStorageKeyFactories = mutableMapOf<String, StorageKeyFactory>()

    fun registerStorageKeyFactory(factory: StorageKeyFactory) {
      require(defaultStorageKeyFactories[factory.protocol] == null) {
        "Storage key factory for '$factory.protocol' already registered"
      }
      defaultStorageKeyFactories[factory.protocol] = factory
    }

    fun reset() {
      defaultStorageKeyFactories.clear()
    }

    fun getFactoryMap(factoriesList: List<StorageKeyFactory>): Map<String, StorageKeyFactory> {
      require(factoriesList.distinctBy { it.protocol }.size == factoriesList.size) {
        "Storage keys protocol must be unique, but was: ${factoriesList.map {it.protocol}}."
      }
      val factories = factoriesList.associateBy { it.protocol }.toMutableMap()
      CapabilitiesResolver.defaultStorageKeyFactories.forEach { (protocol, factory) ->
        factories.getOrPut(protocol) { factory }
      }
      return factories
    }
  }
}
