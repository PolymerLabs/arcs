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

package arcs.core.storage.analytics

/**
 * Defines an interface used for logging storage latencies.
 */
interface LatencyLogger {
    enum class StorageType {
        VOLATILE,
        RAM_DISK,
        PERSISTENT_DATABASE,
        IN_MEMORY_DATABASE
    }

    enum class Operation {
        READ,
        WRITE
    }

    /**
     * Log latency based on [StorageType] and [Operation].
     */
    fun logLatency(latencyMillis: Long, storageType: StorageType, operation: Operation)
}
