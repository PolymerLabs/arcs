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
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import arcs.core.util.TaggedLog

/**
 * [CapabilitiesResolver] is a factory class that creates [StorageKey]s based on the registered
 * providers and given [Capabilities].
 */
class CapabilitiesResolver(
    val options: CapabilitiesResolverOptions,
    private val creators: List<StorageKeyCreatorInfo> = getAllCreators()
) {
    private val log = TaggedLog { "CapabilitiesResolver" }

    /* Options used to construct [CapabilitiesResolver] */
    data class CapabilitiesResolverOptions(val arcId: ArcId)

    /**
     * Options passed to registered [StorageKey] constructors.
     * @property arcId An identifier of an Arc requesting the [StorageKey]
     * @property entitySchema A schema of an entities that will be stored
     * @property unique A unique component of the [StorageKey]
     * @property location A memory location of the [StorageKey]
     */
    interface StorageKeyOptions {
        val arcId: ArcId
        val entitySchema: Schema
        val unique: String
        val location: String
    }

    data class ContainerStorageKeyOptions(
        override val arcId: ArcId,
        override val entitySchema: Schema
    ) : StorageKeyOptions {
        override val unique: String = ""
        override val location: String = arcId.toString()
    }

    data class BackingStorageKeyOptions(
        override val arcId: ArcId,
        override val entitySchema: Schema
    ) : StorageKeyOptions {
        override val unique: String =
            requireNotNull(entitySchema.name).name.ifEmpty { entitySchema.hash }
        override val location: String = unique
    }

    /**
     * Information mapping store capabilities to a corresponding storage protocol and creator
     * method.
     */
    data class StorageKeyCreatorInfo(
        val protocol: String,
        val capabilities: Capabilities,
        val create: StorageKeyCreator
    )

    /** Creates and returns a [StorageKey] corresponding to the given [Capabilities]. */
    fun createStorageKey(
        capabilities: Capabilities,
        type: Type,
        handleId: String
    ): StorageKey? {
        // RamDisk is the default driver.
        val capabilitiesToUse = if (capabilities.isEmpty())
            Capabilities.TiedToRuntime else capabilities
        // TODO: This is a naive and basic solution for picking the appropriate
        // storage key creator for the given capabilities. As more capabilities are
        // added the heuristics will become more robust.
        val creators = findCreators(capabilitiesToUse)
        require(creators.isNotEmpty()) {
            "Cannot create a suitable storage key for $capabilities"
        }
        if (creators.size > 1) {
            log.warning { "Multiple storage key creators for $capabilities" }
        }
        val create = creators.first().create
        val storageKey = create(ContainerStorageKeyOptions(options.arcId, toEntitySchema(type)))
        val childKey = storageKey.childKeyForHandle(handleId)
        if (type is ReferenceType<*>) {
            return childKey
        }
        val backingKey = create(BackingStorageKeyOptions(options.arcId, toEntitySchema(type)))
        return ReferenceModeStorageKey(backingKey, childKey)
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

    /** Returns list of protocols corresponding to the given [Capabilities]. */
    /* internal */ fun findStorageKeyProtocols(capabilities: Capabilities): List<String> {
        return findCreators(capabilities).map { it.protocol }
    }

    /** Returns list of creator info corresponding to the given [Capabilities]. */
    /* internal */ fun findCreators(capabilities: Capabilities): List<StorageKeyCreatorInfo> {
        val result = creators.filter { creator -> creator.capabilities == capabilities }
        if (result.isNotEmpty()) return result
        return creators.filter { creator -> capabilities in creator.capabilities }
    }

    companion object {
        /* internal */ val defaultCreators: MutableList<StorageKeyCreatorInfo> = mutableListOf()
        /* internal */ val registeredCreators: MutableList<StorageKeyCreatorInfo> = mutableListOf()

        /** Registers a default [StorageKey] creator for the given protocol and [Capabilities]. */
        fun registerDefaultKeyCreator(
            protocol: String,
            capabilities: Capabilities,
            create: StorageKeyCreator
        ) {
            defaultCreators.add(
                StorageKeyCreatorInfo(protocol, capabilities, create)
            )
        }

        /** Registers a [StorageKey] creator for the given protocol and [Capabilities]. */
        fun registerKeyCreator(
            protocol: String,
            capabilities: Capabilities,
            create: StorageKeyCreator
        ) {
            registeredCreators.add(
                StorageKeyCreatorInfo(protocol, capabilities, create)
            )
        }

        private fun getAllCreators(): List<StorageKeyCreatorInfo> {
            val creators: MutableList<StorageKeyCreatorInfo> = mutableListOf()
            defaultCreators.forEach { creators.add(it) }
            registeredCreators.forEach { creators.add(it) }
            return creators
        }

        fun reset() {
            registeredCreators.clear()
        }
    }
}

/** A method for generating [StorageKey] for the given parameters. */
typealias StorageKeyCreator = (options: CapabilitiesResolver.StorageKeyOptions) -> StorageKey
