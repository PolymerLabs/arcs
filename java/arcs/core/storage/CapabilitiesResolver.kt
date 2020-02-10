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
import arcs.core.util.TaggedLog

/**
 * [CapabilitiesResolver] is a factory class that creates [StorageKey]s based on the registered
 * providers and given [Capabilities].
 */
class CapabilitiesResolver(
    val options: StorageKeyOptions,
    private val creators: StorageKeyCreatorsMap = getAllCreators()
) {
    private val log = TaggedLog { "CapabilitiesResolver" }

    /* Options used to construct [CapabilitiesResolver] */
    data class StorageKeyOptions(val arcId: ArcId)

    /* Creates and returns a [StorageKey] corresponding to the given [Capabilities]. */
    fun createStorageKey(
        capabilities: Capabilities,
        entitySchemaHash: String? = null
    ): StorageKey? {
        // TODO: This is a naive and basic solution for picking the appropriate
        // storage key creator for the given capabilities. As more capabilities are
        // added the heuristics will become more robust.
        val protocols = findStorageKeyProtocols(capabilities)
        if (protocols.isEmpty()) {
            throw IllegalStateException(
                "Cannot create a suitable storage key for $capabilities"
            )
        } else if (protocols.size > 1) {
            log.warning { "Multiple storage key creators for $capabilities" }
        }
        return creators[protocols.first()]?.second?.invoke(
            options,
            entitySchemaHash ?: ""
        )
    }

    /* Returns set of protocols corresponding to the given [Capabilities]. */
    /* internal */ fun findStorageKeyProtocols(capabilities: Capabilities): Set<String> {
        val protocols: MutableSet<String> = mutableSetOf()
        for ((protocol, creator) in creators) {
            if (creator.first.contains(capabilities)) {
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
typealias StorageKeyCreator = (
    options: CapabilitiesResolver.StorageKeyOptions,
    entitySchemaHash: String
) -> StorageKey

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
