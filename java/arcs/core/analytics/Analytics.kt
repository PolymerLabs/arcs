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

package arcs.core.analytics

import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.Protocols
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog

/** Entry for logging analytics. */
interface Analytics {

    /** Log storage latency based on [StorageType], [HandleType] and [Event]. */
    fun logStorageLatency(
        latencyMillis: Long,
        storageType: StorageType,
        handleType: HandleType,
        event: Event
    )

    /** Types of Storage to log. */
    enum class StorageType {
        VOLATILE,
        RAM_DISK,
        MEMORY_DATABASE,
        DATABASE,
        OTHER,
        REFERENCE_MODE_VOLATILE,
        REFERENCE_MODE_RAM_DISK,
        REFERENCE_MODE_MEMORY_DATABASE,
        REFERENCE_MODE_DATABASE,
        REFERENCE_MODE_OTHER
    }

    /** Types of Handles to log. */
    enum class HandleType {
        SINGLETON,
        COLLECTION,
        OTHER
    }

    /** Types of Storage events to log. */
    enum class Event {
        SYNC_REQUEST_TO_MODEL_UPDATE
    }

    companion object {
        /** Converts a StorageKey to loggable [StorageType]. */
        fun storageKeyToStorageType(storageKey: StorageKey): StorageType {
            if (storageKey is ReferenceModeStorageKey) {
                return when (storageKey.backingKey.protocol) {
                    Protocols.DATABASE_DRIVER -> StorageType.REFERENCE_MODE_DATABASE
                    Protocols.MEMORY_DATABASE_DRIVER -> StorageType.REFERENCE_MODE_MEMORY_DATABASE
                    Protocols.RAMDISK_DRIVER -> StorageType.REFERENCE_MODE_RAM_DISK
                    Protocols.VOLATILE_DRIVER -> StorageType.REFERENCE_MODE_VOLATILE
                    else -> StorageType.REFERENCE_MODE_OTHER
                }
            } else {
                return when (storageKey.protocol) {
                    Protocols.DATABASE_DRIVER -> StorageType.DATABASE
                    Protocols.MEMORY_DATABASE_DRIVER -> StorageType.MEMORY_DATABASE
                    Protocols.RAMDISK_DRIVER -> StorageType.RAM_DISK
                    Protocols.VOLATILE_DRIVER -> StorageType.VOLATILE
                    else -> StorageType.OTHER
                }
            }
        }

        /** Converts a [CrdtModel] to loggable [HandleType]. */
        fun crdtModelToHandleType(crdtModel: CrdtModel<*, *, *>?): HandleType {
            return when (crdtModel) {
                is CrdtSingleton -> HandleType.SINGLETON
                is CrdtSet<*> -> HandleType.COLLECTION
                else -> HandleType.OTHER
            }
        }

        /** Default implementation of [Analytics] which outputs to [TaggedLog]. */
        val defaultAnalytics = object : Analytics {
            private val log = TaggedLog { "Analytics" }

            override fun logStorageLatency(
                latencyMillis: Long,
                storageType: StorageType,
                handleType: HandleType,
                event: Event
            ) {
                log.debug {
                    "Analytics: logStorageLatency: " +
                    "$event, $handleType, $storageType: $latencyMillis (ms)."
                }
            }
        }
    }
}
