/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage.util

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.VersionMap
import arcs.core.storage.util.HoldQueue.Entity
import arcs.core.storage.util.HoldQueue.Record
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Maintainer of a collection of references for data awaiting processing.
 *
 * During [processReferenceId]: when all of the reference's entities' [Entity.version] values are
 * dominated-by the incoming [VersionMap], it is considered ready for processing. (by calling its
 * [Record]'s [Record.onRelease] method)
 */
class HoldQueue {
    private val mutex = Mutex()
    /* internal */ val queue = mutableMapOf<ReferenceId, MutableList<Record>>()

    /**
     * Enqueues a collection of [Entities] into the [HoldQueue]. When they are ready, [onRelease]
     * will be called.
     */
    suspend fun enqueue(entities: Collection<Entity>, onRelease: suspend () -> Unit): Int {
        val holdRecord = Record(
            entities.associateByTo(mutableMapOf(), Entity::id, Entity::version),
            onRelease
        )

        mutex.withLock {
            // Update the queue by adding the holdRecord to the records for each entity's id.
            entities.forEach {
                val list = queue[it.id] ?: mutableListOf()
                list += holdRecord
                queue[it.id] = list
            }
        }

        return holdRecord.hashCode()
    }

    /**
     * Removes a pending item from the [HoldQueue] by the [enqueueId] returned from [enqueue].
     */
    suspend fun removeFromQueue(enqueueId: Int) = mutex.withLock {
        queue.values.forEach { records ->
            records.removeIf { it.hashCode() == enqueueId }
        }
    }

    /**
     * Processes a given [ReferenceId] corresponding to the current [version].
     *
     * See [HoldQueue]'s documentation for more details.
     */
    suspend fun processReferenceId(id: ReferenceId, version: VersionMap) {
        val recordsToRelease = mutableListOf<Record>()
        mutex.withLock {
            // For each record belonging to the id, find all versionMaps which are dominated by the
            // given version and remove them from the record. If that makes the record empty, call
            // the onRelease method.
            queue[id]?.forEach { record ->
                record.ids[id]
                    ?.takeIf { version dominates it }
                    ?.let { record.ids.remove(id) }

                if (record.ids.isEmpty()) {
                    recordsToRelease += record
                }
            }
            queue.remove(id)
        }

        recordsToRelease.forEach { it.onRelease() }
    }

    /** Simple alias for an entity being referenced. */
    data class Entity(val id: ReferenceId, val version: VersionMap?)

    // Internal for testing.
    /* internal */ data class Record(
        val ids: MutableMap<ReferenceId, VersionMap?>,
        val onRelease: suspend () -> Unit
    )
}

/**
 * Enqueues all [Referencable]s in the collection into the [HoldQueue] at the specified [version]
 * with a given [onRelease] callback.
 */
suspend fun <T : Referencable> Collection<T>.enqueueAll(
    holdQueue: HoldQueue,
    version: VersionMap,
    onRelease: suspend () -> Unit
) = holdQueue.enqueue(map { it.toHoldQueueEntity(version) }, onRelease)

/**
 * Converts an object implementing [Referencable] to a [HoldQueue.Entity] with the specified
 * [version].
 */
fun <T : Referencable> T.toHoldQueueEntity(version: VersionMap): Entity =
    Entity(this.id, version.copy()) // TODO: maybe we shouldn't copy the version map?
