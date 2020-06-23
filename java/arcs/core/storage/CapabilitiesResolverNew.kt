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
import arcs.core.data.CapabilitiesNew
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type

/**
 * [CapabilitiesResolverNew] is a factory class that creates [StorageKey]s based on the registered
 * providers and given [CapabilitiesNew].
 */
class CapabilitiesResolverNew(
    val options: Options,
    factoriesList: List<StorageKeyFactory> = listOf(),
    val selector: FactorySelector = SimpleCapabilitiesSelector()
) {
    val factories: Map<String, StorageKeyFactory>

    init {
        require(factoriesList.distinctBy { it.protocol }.size == factoriesList.size) {
            "Storage keys protocol must be unique $factoriesList."
        }
        factories = factoriesList.map { it.protocol to it }.toMap().toMutableMap()
        CapabilitiesResolverNew.defaultStorageKeyFactories.forEach { (protocol, factory) ->
            if (factories[protocol] == null) factories.put(protocol, factory)
        }
    }

    /* Options used to construct [CapabilitiesResolver] */
    data class Options(val arcId: ArcId)

    fun createStorageKey(capabilities: CapabilitiesNew, type: Type, handleId: String): StorageKey {
        val selectedFactories =
            // defaultStorageKeyFactories.filterValues { it.supports(capabilities) } +
            factories.filterValues { it.supports(capabilities) }

        if (selectedFactories.isEmpty()) {
            throw IllegalStateException("Cannot create storage key for handle '$handleId' with " +
                "capabilities $capabilities")
        }
        val factory = selector.select(selectedFactories.values)
        return createStorageKeyWithFactory(requireNotNull(factory), type, handleId)
    }

    fun createStorageKeyWithFactory(
        factory: StorageKeyFactory,
        type: Type,
        handleId: String
    ): StorageKey {
        val containerKey = factory.create(StorageKeyFactory.ContainerStorageKeyOptions(
            options.arcId, toEntitySchema(type)))
        val containerChildKey = containerKey.childKeyForHandle(handleId)
        if (type is ReferenceType<*>) {
            return containerChildKey
        }
        val backingKey = factory.create(
            StorageKeyFactory.BackingStorageKeyOptions(options.arcId, toEntitySchema(type)))
        // ReferenceModeStorageKeys in different drivers can cause problems with garbage collection.
        require(backingKey.protocol == containerKey.protocol) {
            "Backing and containers keys must use same protocol"
        }
        return ReferenceModeStorageKey(backingKey, containerChildKey)
    }

    /**
     * Retrieves [Schema] from the given [Type], if possible.
     * TODO: declare a common interface.
     */
    private fun toEntitySchema(type: Type): Schema {
        when (type) {
            is SingletonType<*> -> if (type.containedType is EntityType) {
                return (type.containedType as EntityType).entitySchema
            }
            is CollectionType<*> -> if (type.collectionType is EntityType) {
                return (type.collectionType as EntityType).entitySchema
            }
            is ReferenceType<*> -> return type.entitySchema!!
            is EntityType -> return type.entitySchema
        }
        throw IllegalArgumentException("Can't retrieve entitySchema of unknown type $type")
    }

    // An interface for selecting a factory, if more than one are available for the Capabilities.
    interface FactorySelector {
        fun select(factories: Collection<StorageKeyFactory>): StorageKeyFactory
    }

    // An implementation of a FactorySelector choosing a factory with a least
    // restrictive max capabilities set.
    class SimpleCapabilitiesSelector(
        val sortedProtocols: Array<String> = arrayOf("volatile", "ramdisk", "memdb", "db")
    ) : FactorySelector {
        override fun select(factories: Collection<StorageKeyFactory>): StorageKeyFactory {
            require(factories.isNotEmpty()) { "Cannot select from empty factories list" }
            val compareProtocol = compareBy { protocol: String ->
                val index = sortedProtocols.indexOf(protocol)
                if (index >= 0) { index } else sortedProtocols.size
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
    }
}
