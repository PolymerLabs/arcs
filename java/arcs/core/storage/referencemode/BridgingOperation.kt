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

import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.internal.VersionMap
import arcs.core.data.RawEntity
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.referencemode.BridgingOperation.AddToSet
import arcs.core.storage.referencemode.BridgingOperation.ClearSingleton
import arcs.core.storage.referencemode.BridgingOperation.RemoveFromSet
import arcs.core.storage.referencemode.BridgingOperation.UpdateSingleton
import arcs.core.storage.toReference

/**
 * Represents a bridge between the [CrdtSet]/[CrdtSingleton]'s operations from the
 * [arcs.storage.ReferenceModeStore]'s `containerStore` with the client's expected
 * [RefModeStoreOp]s.
 *
 * When the [arcs.storage.ReferenceModeStore] handles communication between external storage proxies
 * and the internal containerStore, this class (and its subclasses) is used as a translation medium.
 */
sealed class BridgingOperation : CrdtOperationAtTime {
    abstract val entityValue: RawEntity?
    /** Represents a value added/removed from a [CrdtSet] or configured for a [CrdtSingleton]. */
    abstract val referenceValue: Reference?
    /** The actual [CrdtSet] or [CrdtSingleton] operation. */
    abstract val containerOp: CrdtOperationAtTime
    /** The operation sent to the [arcs.storage.ReferenceModeStore]. */
    abstract val refModeOp: RefModeStoreOp

    /** Denotes an update to the [CrdtSingleton] managed by the store. */
    data class UpdateSingleton /* internal */ constructor(
        override val entityValue: RawEntity?,
        override val referenceValue: Reference?,
        override val containerOp: CrdtSingleton.Operation.Update<Reference>,
        override val refModeOp: RefModeStoreOp.SingletonUpdate
    ) : BridgingOperation() {
        override val clock: VersionMap = containerOp.clock
    }

    /** Denotes a clearing of the [CrdtSingleton] managed by the store. */
    data class ClearSingleton /* internal */ constructor(
        override val containerOp: CrdtSingleton.Operation.Clear<Reference>,
        override val refModeOp: RefModeStoreOp.SingletonClear
    ) : BridgingOperation() {
        override val entityValue: RawEntity? = null
        override val referenceValue: Reference? = null
        override val clock: VersionMap = containerOp.clock
    }

    /** Denotes an addition to the [CrdtSet] managed by the store. */
    class AddToSet /* internal */ constructor(
        override val entityValue: RawEntity?,
        override val referenceValue: Reference?,
        override val containerOp: CrdtSet.Operation.Add<Reference>,
        override val refModeOp: RefModeStoreOp.SetAdd
    ) : BridgingOperation() {
        override val clock: VersionMap = containerOp.clock
    }

    /** Denotes a removal from the [CrdtSet] managed by the store. */
    class RemoveFromSet /* internal */ constructor(
        override val entityValue: RawEntity?,
        override val referenceValue: Reference?,
        override val containerOp: CrdtSet.Operation.Remove<Reference>,
        override val refModeOp: RefModeStoreOp.SetRemove
    ) : BridgingOperation() {
        override val clock: VersionMap = containerOp.clock
    }
}

/**
 * Converts a [List] of [CrdtOperation]s to a [List] of [BridgingOperation]s.
 *
 * Since [arcs.storage.ReferenceModeStore] only supports operations on [CrdtSingleton]s or
 * [CrdtSet]s, this method will throw [CrdtException] if any member of the list is not one of those
 * types of [CrdtOperation]s.
 */
fun List<RefModeStoreOp>.toBridgingOps(
    backingStorageKey: StorageKey
): List<BridgingOperation> = map {
    it.toBridgingOp(backingStorageKey)
}

/**
 * Converts a [CrdtOperationAtTime] from some referencable-typed operation to [BridgingOperation]
 * using the provided [value] as the full data referenced in the [CrdtSet]/[CrdtSingleton].
 */
@Suppress("UNCHECKED_CAST")
fun CrdtOperationAtTime.toBridgingOp(value: RawEntity?): BridgingOperation =
    when (this) {
        is CrdtSet.Operation<*> ->
            (this as CrdtSet.Operation<Reference>).setToBridgingOp(requireNotNull(value))
        is CrdtSingleton.Operation<*> ->
            (this as CrdtSingleton.Operation<Reference>).singletonToBridgingOp(value)
        else -> throw CrdtException("Unsupported raw entity operation")
    }

/**
 * Bridges the gap between a [RefModeStoreOp] and the appropriate [Reference]-based collection
 * operation.
 */
fun RefModeStoreOp.toBridgingOp(backingStorageKey: StorageKey): BridgingOperation = when (this) {
    is RefModeStoreOp.SingletonUpdate -> {
        val reference = value.toReference(backingStorageKey, clock)
        UpdateSingleton(
            value, reference, CrdtSingleton.Operation.Update(actor, clock, reference), this
        )
    }
    is RefModeStoreOp.SingletonClear -> {
        ClearSingleton(CrdtSingleton.Operation.Clear(actor, clock), this)
    }
    is RefModeStoreOp.SetAdd -> {
        val reference = added.toReference(backingStorageKey, clock)
        AddToSet(added, reference, CrdtSet.Operation.Add(actor, clock, reference), this)
    }
    is RefModeStoreOp.SetRemove -> {
        val reference = removed.toReference(backingStorageKey, clock)
        RemoveFromSet(removed, reference, CrdtSet.Operation.Remove(actor, clock, reference), this)
    }
    else -> throw CrdtException("Unsupported operation: $this")
}

/**
 * Bridges the gap between a [Reference]-based [CrdtSingleton.Operation] and a [RefModeStoreOp],
 * using the provided [newValue] as the [RawEntity].
 */
private fun CrdtSet.Operation<Reference>.setToBridgingOp(
    newValue: RawEntity
): BridgingOperation = when (this) {
    is CrdtSet.Operation.Add ->
        AddToSet(
            newValue,
            added,
            this,
            RefModeStoreOp.SetAdd(actor, clock, newValue)
        )
    is CrdtSet.Operation.Remove ->
        RemoveFromSet(
            newValue,
            removed,
            this,
            RefModeStoreOp.SetRemove(actor, clock, newValue)
        )
    is CrdtSet.Operation.FastForward ->
        throw CrdtException("Unsupported reference-mode operation: FastForward.")
}

/**
 * Bridges the gap between a [Reference]-based [CrdtSingleton.Operation] and a [RefModeStoreOp],
 * using the provided [newValue] as the [RawEntity].
 */
private fun CrdtSingleton.Operation<Reference>.singletonToBridgingOp(
    newValue: RawEntity?
): BridgingOperation = when (this) {
    is CrdtSingleton.Operation.Update ->
        UpdateSingleton(
            newValue,
            value,
            this,
            RefModeStoreOp.SingletonUpdate(actor, clock, requireNotNull(newValue))
        )
    is CrdtSingleton.Operation.Clear ->
        ClearSingleton(this, RefModeStoreOp.SingletonClear(actor, clock))
}
