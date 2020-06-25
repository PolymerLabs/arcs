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
import arcs.core.storage.keys.Protocols
import arcs.core.util.Log

/** Entry for logging analytics. */
object Analytics {

    /** Overwrite this variable with a different [Logger] to switch logging destination. */
    var logger: Logger = DEFAULT_LOGGER

    /** Types of StorageKey to log. */
    enum class StorageType {
        VOLATILE,
        RAM_DISK,
        MEMORY_DATABASE,
        DATABASE,
        JOIN,
        OTHER
    }

    /** Types of Handle to log. */
    enum class HandleType {
        SINGLETON,
        COLLECTION,
        OTHER
    }

    /** Event to log. */
    enum class Event {
        SYNC_REQUEST_TO_MODEL_UPDATE
    }


    /** Converts a StorageKey to loggable [StorageType]. */
    fun protocolToStorageType(storageKey: String) : StorageType {
        return when (storageKey) {
          Protocols.DATABASE_DRIVER -> StorageType.DATABASE
          Protocols.MEMORY_DATABASE_DRIVER -> StorageType.MEMORY_DATABASE
          Protocols.RAMDISK_DRIVER -> StorageType.RAM_DISK
          Protocols.VOLATILE_DRIVER -> StorageType.VOLATILE
          else -> StorageType.OTHER
        }
    }

    /** Converts a [CrdtModel] to loggable [HandleType]. */
    fun crdtModelToHandleType(crdtModel: CrdtModel<*, *, *>) : HandleType {
        return when(crdtModel) {
            is CrdtSingleton -> HandleType.SINGLETON
            is CrdtSet<*> -> HandleType.COLLECTION
            else -> HandleType.OTHER
        }
    }

    /** Implement this interface to send logs to where they belong, e.g. a backend. */
    interface Logger {

        /**
         * Log storage latency based on [StorageType], [HandleType] and [Event] as dimensions.
         */
        fun logStorageLatency(
            latencyMillis: Long,
            storageType: StorageType,
            handleType: HandleType,
            event: Event
        )
    }
}

/** Default implementation of [Analytics.Logger] which outputs analytics to [Log]. */
private val DEFAULT_LOGGER = object : Analytics.Logger {
    override fun logStorageLatency(
        latencyMillis: Long,
        storageType: Analytics.StorageType,
        handleType: Analytics.HandleType,
        event: Analytics.Event
    ) {
        Log.debug {
            "Analytics: logStorageLatency: " +
            "$event, $handleType, $storageType: $latencyMillis (ms)."
        }
    }
}
