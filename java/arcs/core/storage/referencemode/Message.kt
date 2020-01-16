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

package arcs.core.storage.referencemode

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.storage.ProxyMessage
import kotlinx.coroutines.CompletableDeferred

/**
 * Wrapper for [ProxyMessage]s coming into the [arcs.storage.ReferenceModeStore] and awaiting
 * processing.
 */
sealed class Message(
    /** The [ProxyMessage] being wrapped. */
    open val message: ProxyMessage<out CrdtData, out CrdtOperationAtTime, *>,
    /** The [UpdateSource] from whence the message came. */
    open val source: UpdateSource
) {
    open fun toEnqueued(deferred: CompletableDeferred<Boolean>): Message {
        throw UnsupportedOperationException("toEnqueued not implemented")
    }

    /** Sources of incoming update messages. */
    enum class UpdateSource {
        Container,
        BackingStore,
        StorageProxy,
    }

    /** Denotes a [Message] before being enqueued. */
    interface PreEnqueued
    /** Denotes a [Message] after being enqueued. */
    interface Enqueued {
        /**
         * Deferred which  will be completed with the result of the processed message when the
         * message is drained.
         */
        val deferred: CompletableDeferred<Boolean>
    }

    /*
     * Messages coming from the storage proxy.
     */

    data class PreEnqueuedFromStorageProxy(
        override val message: ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>,
        override val source: UpdateSource = UpdateSource.StorageProxy
    ) : Message(message, source), PreEnqueued {
        override fun toEnqueued(deferred: CompletableDeferred<Boolean>) =
            EnqueuedFromStorageProxy(message, deferred)
    }

    data class EnqueuedFromStorageProxy(
        override val message: ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>,
        override val deferred: CompletableDeferred<Boolean>,
        override val source: UpdateSource = UpdateSource.StorageProxy
    ) : Message(message, source), Enqueued

    /*
     * Messages coming from the backing store.
     */

    data class PreEnqueuedFromBackingStore(
        override val message: ProxyMessage<CrdtData, CrdtOperationAtTime, Referencable>,
        val muxId: ReferenceId,
        override val source: UpdateSource = UpdateSource.BackingStore
    ) : Message(message, source), PreEnqueued {
        override fun toEnqueued(deferred: CompletableDeferred<Boolean>) =
            EnqueuedFromBackingStore(message, muxId, deferred)
    }

    data class EnqueuedFromBackingStore(
        override val message: ProxyMessage<CrdtData, CrdtOperationAtTime, Referencable>,
        val muxId: String,
        override val deferred: CompletableDeferred<Boolean>,
        override val source: UpdateSource = UpdateSource.BackingStore
    ) : Message(message, source), Enqueued

    /*
     * Messages coming from the container.
     */

    data class PreEnqueuedFromContainer(
        override val message: ProxyMessage<CrdtData, CrdtOperationAtTime, Referencable>,
        override val source: UpdateSource = UpdateSource.Container
    ) : Message(message, source), PreEnqueued {
        override fun toEnqueued(deferred: CompletableDeferred<Boolean>) =
            EnqueuedFromContainer(message, deferred)
    }

    data class EnqueuedFromContainer(
        override val message: ProxyMessage<CrdtData, CrdtOperationAtTime, Referencable>,
        override val deferred: CompletableDeferred<Boolean>,
        override val source: UpdateSource = UpdateSource.Container
    ) : Message(message, source), Enqueued
}

/** Converts a general [ProxyMessage] into a reference mode-safe [ProxyMessage]. */
fun ProxyMessage<CrdtData, CrdtOperation, Any?>.toReferenceModeMessage():
    ProxyMessage<CrdtData, CrdtOperationAtTime, Referencable> {
    return when (this) {
        is ProxyMessage.ModelUpdate ->
            ProxyMessage.ModelUpdate(model, id)
        is ProxyMessage.Operations ->
            ProxyMessage.Operations(operations.toReferenceModeMessageOps(), id)
        is ProxyMessage.SyncRequest -> ProxyMessage.SyncRequest(id)
    }
}

@Suppress("UNCHECKED_CAST")
private fun List<CrdtOperation>.toReferenceModeMessageOps(): List<CrdtOperationAtTime> {
    return this.map { op ->
        when (op) {
            is CrdtSingleton.Operation.Update<*> ->
                CrdtSingleton.Operation.Update(op.actor, op.clock, op.value)
            is CrdtSingleton.Operation.Clear<*> ->
                CrdtSingleton.Operation.Clear<Referencable>(op.actor, op.clock)
            is CrdtSet.Operation.Add<*> ->
                CrdtSet.Operation.Add(op.actor, op.clock, op.added)
            is CrdtSet.Operation.Remove<*> ->
                CrdtSet.Operation.Add(op.actor, op.clock, op.removed)
            else -> throw CrdtException("Unsupported operation for ReferenceModeStore: $this")
        }
    }
}
