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
    var creators: StorageKeyCreatorsMap = mutableMapOf()
) {

    private val log = TaggedLog { "CapabilitiesResolver" }

    init {
        if (creators.isEmpty()) {
            CapabilitiesResolver.defaultCreators.forEach {
                protocol, creator -> creators[protocol] = creator
            }
            CapabilitiesResolver.registeredCreators.forEach {
                protocol, creator -> creators[protocol] = creator
            }
        }
    }

    data class StorageKeyOptions(val arcId: ArcId)
    data class CapabilitiesCreator(
        val capabilities: Capabilities,
        val create: StorageKeyCreator
    )

    fun createStorageKey(
        capabilities: Capabilities,
        entitySchemaHash: String? = null
    ): StorageKey? {
        // TODO: This is a naive and basic solution for picking the appropriate
        // storage key creator for the given capabilities. As more capabilities are
        // added the heuristics is to become more robust.
        val protocols = findStorageKeyProtocols(capabilities)
        if (protocols.isEmpty()) {
            throw IllegalStateException(
                "Cannot create a suitable storage key for $capabilities.toString()"
            )
        } else if (protocols.size > 1) {
            log.warning { "Multiple storage key creators for $capabilities.toString()" }
        }
        return this.creators[protocols.first()]?.create?.invoke(
            options,
            entitySchemaHash ?: ""
        )
    }

    fun findStorageKeyProtocols(capabilities: Capabilities): Set<String> {
        val protocols: MutableSet<String> = mutableSetOf()
        creators.forEach { protocol, creator ->
            if (creator.capabilities.contains((capabilities))) {
                protocols.add(protocol)
            }
        }
        return protocols
    }

    companion object {
        /* internal */ val defaultCreators: StorageKeyCreatorsMap = mutableMapOf()
        /* internal */ val registeredCreators: StorageKeyCreatorsMap = mutableMapOf()

        fun registerDefaultKeyCreator(
            protocol: String,
            capabilities: Capabilities,
            create: StorageKeyCreator
        ) {
            CapabilitiesResolver.defaultCreators[protocol] =
                CapabilitiesCreator(capabilities, create)
        }

        fun registerKeyCreator(
            protocol: String,
            capabilities: Capabilities,
            create: StorageKeyCreator
        ) {
            if (CapabilitiesResolver.registeredCreators.containsKey(protocol)) {
                throw Error("Key creator for protocol $protocol already registered.")
            }
            CapabilitiesResolver.registeredCreators[protocol] =
                CapabilitiesCreator(capabilities, create)
        }

        fun reset() {
            CapabilitiesResolver.registeredCreators.clear()
        }
    }
}

typealias StorageKeyCreator = (
    options: CapabilitiesResolver.StorageKeyOptions,
    entitySchemaHash: String
) -> StorageKey
typealias StorageKeyCreatorsMap = MutableMap<String, CapabilitiesResolver.CapabilitiesCreator>
