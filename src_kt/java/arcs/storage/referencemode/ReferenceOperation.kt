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

package arcs.storage.referencemode

import arcs.common.Referencable
import arcs.crdt.CrdtException
import arcs.crdt.CrdtOperation
import arcs.crdt.CrdtOperationAtTime
import arcs.crdt.CrdtSet
import arcs.crdt.CrdtSingleton
import arcs.crdt.internal.VersionMap
import arcs.data.RawEntity
import arcs.storage.StorageKey
import arcs.storage.referencemode.ReferenceOperation.AddToSet
import arcs.storage.referencemode.ReferenceOperation.ClearSingleton
import arcs.storage.referencemode.ReferenceOperation.RemoveFromSet
import arcs.storage.referencemode.ReferenceOperation.UpdateSingleton

/** Operation performed on the data managed by the [arcs.storage.ReferenceModeStore]. */
sealed class ReferenceOperation : CrdtOperationAtTime {
    abstract val entityValue: Referencable?
    /** Represents a value added/removed from a [CrdtSet] or configured for a [CrdtSingleton]. */
    abstract val referenceValue: Reference?
    /** The actual [CrdtSet] or [CrdtSingleton] operation. */
    abstract val containerOp: CrdtOperationAtTime
    /** The [Type] of [ReferenceOperation]. */
    abstract val type: Type

    /** Simple type identifier for a [ReferenceOperation]. Useful when serializing. */
    enum class Type {
        SingletonUpdate,
        SingletonClear,
        SetAdd,
        SetRemove,
    }

    /** Denotes an update to the [Singleton] managed by the store. */
    data class UpdateSingleton(
        override val entityValue: Referencable?,
        override val referenceValue: Reference?,
        override val containerOp: CrdtSingleton.Operation.Update<Reference>
    ) : ReferenceOperation() {
        override val clock: VersionMap = containerOp.clock
        override val type: Type = Type.SingletonUpdate
    }

    /** Denotes an update to the [Singleton] managed by the store. */
    data class ClearSingleton(
        override val containerOp: CrdtSingleton.Operation.Clear<Reference>
    ) : ReferenceOperation() {
        override val entityValue: Referencable? = null
        override val referenceValue: Reference? = null
        override val clock: VersionMap = containerOp.clock
        override val type: Type = Type.SingletonClear
    }

    /** Denotes a change to a particular [CrdtSet]. */
    class AddToSet(
        override val entityValue: Referencable?,
        override val referenceValue: Reference?,
        override val containerOp: CrdtSet.Operation.Add<Reference>
    ) : ReferenceOperation() {
        override val clock: VersionMap = containerOp.clock
        override val type: Type = Type.SetAdd
    }

    /** Denotes a change to a particular [CrdtSet]. */
    class RemoveFromSet(
        override val entityValue: Referencable?,
        override val referenceValue: Reference?,
        override val containerOp: CrdtSet.Operation.Remove<Reference>
    ) : ReferenceOperation() {
        override val clock: VersionMap = containerOp.clock
        override val type: Type = Type.SetRemove
    }
}

/**
 * Covnverts a [List] of [CrdtOperation]s to a [List] of [ReferenceOperation]s.
 *
 * Since [arcs.storage.ReferenceModeStore] only supports operations on [CrdtSingleton]s or
 * [CrdtSet]s, this method will throw [CrdtException] if any member of the list is not one of those
 * types of [CrdtOperation]s.
 */
fun List<CrdtOperation>.toReferenceOperations(
    storageKey: StorageKey
): List<ReferenceOperation> = map { it.toReferenceOperation(storageKey) }

/**
 * Converts a [CrdtOperation] to a [ReferenceOperation].
 *
 * Since [arcs.storage.ReferenceModeStore] only supports operations on [CrdtSingleton]s or
 * [CrdtSet]s, this method will throw [CrdtException] if another operation type is used.
 */
@Suppress("UNCHECKED_CAST")
fun CrdtOperation.toReferenceOperation(storageKey: StorageKey): ReferenceOperation =
    when (this) {
        is CrdtSet.Operation<*> ->
            (this as CrdtSet.Operation<RawEntity>).toSetReferenceOp(storageKey)
        is CrdtSingleton.Operation<*> ->
            (this as CrdtSingleton.Operation<RawEntity>).toSingletonReferenceOp(storageKey)
        is ReferenceOperation -> this
        else -> throw CrdtException("Unsupported reference-mode operation")
    }

/**
 * Converts a [CrdtOperation] from some referencable-typed operation to a [RawEntity]-typed with the
 * provided [value].
 */
fun CrdtOperation.transformOp(value: RawEntity?): RefModeStoreOp =
    when (this) {
        is CrdtSet.Operation<*> -> this.transformSetOp(requireNotNull(value))
        is CrdtSingleton.Operation<*> -> this.transformSingletonOp(value)
        else -> throw CrdtException("Unsupported raw entity operation")
    }

/**
 * Converts a non-[Reference] based [CrdtSet.Operation] to a [Reference]-based one, for use with the
 * [arcs.storage.ReferenceModeStore].
 */
private fun CrdtSet.Operation<RawEntity>.toSetReferenceOp(
    storageKey: StorageKey
): ReferenceOperation = when (this) {
    is CrdtSet.Operation.Add -> {
        val reference = added.toReference(storageKey, clock)
        AddToSet(added, reference, CrdtSet.Operation.Add(clock, actor, reference))
    }
    is CrdtSet.Operation.Remove -> {
        val reference = removed.toReference(storageKey, clock)
        RemoveFromSet(removed, reference, CrdtSet.Operation.Remove(clock, actor, reference))
    }
    is CrdtSet.Operation.FastForward ->
        throw CrdtException("Unsupported reference-mode operation: FastForward.")
}

/**
 * Converts a non-[Reference] based [CrdtSingleton.Operation] to a [Reference]-based one, for use
 * with the [arcs.storage.ReferenceModeStore].
 */
private fun CrdtSingleton.Operation<RawEntity>.toSingletonReferenceOp(
    storageKey: StorageKey
): ReferenceOperation = when (this) {
    is CrdtSingleton.Operation.Update -> {
        val reference = value.toReference(storageKey, clock)
        UpdateSingleton(value, reference, CrdtSingleton.Operation.Update(actor, clock, reference))
    }
    is CrdtSingleton.Operation.Clear -> {
        ClearSingleton(CrdtSingleton.Operation.Clear(actor, clock))
    }
}

/**
 * Converts a non-[RawEntity]-based [CrdtSet.Operation] to a [RawEntity]-based one, for sending back
 * to the storage proxy from a [arcs.storage.ReferenceModeStore].
 */
private fun <O : Referencable> CrdtSet.Operation<O>.transformSetOp(
    newValue: RawEntity
): RefModeStoreOp = when (this) {
    is CrdtSet.Operation.Add -> RefModeStoreOp.SetAdd(actor, clock, newValue)
    is CrdtSet.Operation.Remove -> RefModeStoreOp.SetRemove(actor, clock, newValue)
    is CrdtSet.Operation.FastForward ->
        throw CrdtException("Unsupported reference-mode operation: FastForward.")
}

/**
 * Converts a non-[RawEntity]-based [CrdtSingleton.Operation] to a [RawEntity]-based one, for
 * sending back to the storage proxy from a [arcs.storage.ReferenceModeStore].
 */
private fun <O : Referencable> CrdtSingleton.Operation<O>.transformSingletonOp(
    newValue: RawEntity?
): RefModeStoreOp = when (this) {
    is CrdtSingleton.Operation.Update ->
        RefModeStoreOp.SingletonUpdate(actor, clock, requireNotNull(newValue))
    is CrdtSingleton.Operation.Clear -> RefModeStoreOp.SingletonClear(actor, clock)
}

/** Converts any [Referencable] object into a reference-mode-friendly [Reference] object. */
private fun Referencable.toReference(storageKey: StorageKey, version: VersionMap) =
    Reference(id, storageKey, version)
