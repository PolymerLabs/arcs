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
import arcs.core.data.Schema
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog

/**
 * [CapabilitiesResolver] is a factory class that creates [StorageKey]s based on the registered
 * providers and given [Capabilities].
 */
class CapabilitiesResolver(
    val options: CapabilitiesResolverOptions,
    private val creators: StorageKeyCreatorsMap = getAllCreators()
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

    /* Creates and returns a [StorageKey] corresponding to the given [Capabilities]. */
    fun createStorageKey(
        capabilities: Capabilities,
        entitySchema: Schema,
        handleId: String
    ): StorageKey? {
        // TODO: This is a naive and basic solution for picking the appropriate
        // storage key creator for the given capabilities. As more capabilities are
        // added the heuristics will become more robust.
        val protocols = findStorageKeyProtocols(capabilities)
        require(protocols.isNotEmpty()) {
            "Cannot create. a suitable storage key for $capabilities"
        }
        if (protocols.size > 1) {
            log.warning { "Multiple storage key creators for $capabilities" }
        }
        val creator = requireNotNull(creators[protocols.first()]?.second)
        val backingKey = creator.invoke(BackingStorageKeyOptions(options.arcId, entitySchema))
        val storageKey = creator.invoke(ContainerStorageKeyOptions(options.arcId, entitySchema))
        return ReferenceModeStorageKey(backingKey, storageKey.childKeyForHandle(handleId))
    }

    /* Returns set of protocols corresponding to the given [Capabilities]. */
    /* internal */ fun findStorageKeyProtocols(capabilities: Capabilities): Set<String> {
        val protocols: MutableSet<String> = mutableSetOf()
        for ((protocol, creator) in creators) {
            if (capabilities in creator.first) {
                protocols.add(protocol)
            }
        }
        return protocols
    }

    companion object {
        /* internal */ val defaultCreators: StorageKeyCreatorsMutableMap = mutableMapOf()
        /* internal */ val registeredCreators: StorageKeyCreatorsMutableMap = mutableMapOf()

        /* Registers a default [StorageKey] creator for the given protocol and [Capabilities]. */
        fun registerDefaultKeyCreator(
            protocol: String,
            capabilities: Capabilities,
            create: StorageKeyCreator
        ) {
            CapabilitiesResolver.defaultCreators[protocol] = capabilities to create
        }

        /* Registers a [StorageKey] creator for the given protocol and [Capabilities]. */
        fun registerKeyCreator(
            protocol: String,
            capabilities: Capabilities,
            create: StorageKeyCreator
        ) {
            if (CapabilitiesResolver.registeredCreators.containsKey(protocol)) {
                throw Error("Key creator for protocol $protocol already registered.")
            }
            CapabilitiesResolver.registeredCreators[protocol] = capabilities to create
        }

        private fun getAllCreators(): StorageKeyCreatorsMap {
            val creators: StorageKeyCreatorsMutableMap = mutableMapOf()
            for ((protocol, creator) in CapabilitiesResolver.defaultCreators) {
                creators[protocol] = creator
            }
            for ((protocol, creator) in CapabilitiesResolver.registeredCreators) {
                creators[protocol] = creator
            }
            return creators
        }

        fun reset() {
            CapabilitiesResolver.registeredCreators.clear()
        }
    }
}

/* A method for generating [StorageKey] for the given parameters. */
typealias StorageKeyCreator = (options: CapabilitiesResolver.StorageKeyOptions) -> StorageKey

/**
 * An alias for a map containing mappings of protocol to corresponding Capabilities and
 * [StorageKeyCreator].
 */
typealias StorageKeyCreatorsMap = Map<String, Pair<Capabilities, StorageKeyCreator>>

/**
 * An alias for a mutable map containing mappings of protocol to corresponding Capabilities and
 * [StorageKeyCreator].
 */
private typealias StorageKeyCreatorsMutableMap =
    MutableMap<String, Pair<Capabilities, StorageKeyCreator>>
