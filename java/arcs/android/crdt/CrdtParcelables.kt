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

package arcs.android.crdt

import android.os.Parcel
import android.os.Parcelable
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton

/** Base interface for [Parcelable] implementations of [CrdtData] classes. */
interface ParcelableCrdtData<T : CrdtData> : CrdtData, Parcelable {
    val actual: T
}

/** Base interface for [Parcelable] implementations of [CrdtOperation] classes. */
interface ParcelableCrdtOperation<T : CrdtOperation> : CrdtOperation, Parcelable {
    val actual: T
}

/** Base interface for [Parcelable] implementations of [CrdtOperationAtTime] classes. */
interface ParcelableCrdtOperationAtTime<T : CrdtOperationAtTime> :
    ParcelableCrdtOperation<T>, CrdtOperationAtTime

/** Writes [CrdtData] to the [Parcel]. */
@Suppress("UNCHECKED_CAST")
fun Parcel.writeModelData(model: CrdtData?, flags: Int) {
    when (model) {
        null -> writeTypedObject(null, flags)
        is CrdtCount.Data ->
            writeTypedObject((model as? CrdtCount.Data)?.toParcelable(), flags)
        // Caution: CrdtSingleton.Data extends CrdtSet.Data, so we must check it first.
        is CrdtSingleton.Data<*> ->
            writeTypedObject((model as? CrdtSingleton.Data<Referencable>)?.toParcelable(), flags)
        is CrdtSet.Data<*> ->
            writeTypedObject((model as? CrdtSet.Data<Referencable>)?.toParcelable(), flags)
        is CrdtEntity.Data ->
            TODO("Implement me when ParcelableEntity is ready")
        else -> throw IllegalArgumentException("Unsupported CrdtData type: ${model.javaClass}")
    }
}

/** Reads [CrdtData] from the [Parcel], using the [expectedType] as a hint. */
fun Parcel.readModelData(expectedType: ParcelableCrdtType): CrdtData? =
    readTypedObject(
        requireNotNull(expectedType.crdtDataCreator) {
            "No crdtDataCreator for type $expectedType"
        }
    )?.actual

/** Writes a [CrdtOperation] to the [Parcel]. */
@Suppress("UNCHECKED_CAST")
fun Parcel.writeOperation(operation: CrdtOperation?, flags: Int) {
    when (operation) {
        null -> writeTypedObject(null, flags)
        is CrdtCount.Operation ->
            writeTypedObject((operation as? CrdtCount.Operation)?.toParcelable(), flags)
        is CrdtSet.Operation<*> ->
            writeTypedObject((operation as? CrdtSet.Operation<Referencable>)?.toParcelable(), flags)
        is CrdtSingleton.Operation<*> ->
            writeTypedObject(
                (operation as? CrdtSingleton.Operation<Referencable>)?.toParcelable(), flags)
        is CrdtEntity.Operation ->
            TODO("Implement me when ParcelableEntity is ready")
        else ->
            throw IllegalArgumentException("Unsupported CrdtOperation type: ${operation.javaClass}")
    }
}

/** Reads a [CrdtOperation] from the [Parcel]. */
fun Parcel.readOperation(expectedType: ParcelableCrdtType): CrdtOperation? =
    readTypedObject(
        requireNotNull(expectedType.crdtOperationCreator) {
            "No crdtOperationCreator for type $expectedType"
        }
    )?.actual

/** Writes a [List] of [CrdtOperation]s to the [Parcel]. */
fun Parcel.writeOperations(operations: List<CrdtOperation>, flags: Int) {
    writeInt(operations.size)
    operations.forEach { writeOperation(it, flags) }
}

/** Reads a [List] of [CrdtOperation]s from the [Parcel]. */
fun Parcel.readOperations(expectedType: ParcelableCrdtType): List<CrdtOperation> {
    val size = readInt()
    if (size == 0) return emptyList()
    val result = mutableListOf<CrdtOperation>()
    repeat(size) { index ->
        result += requireNotNull(readOperation(expectedType)) {
            "Couldn't find CrdtOperation in list at index $index in Parcel, expected length: $size"
        }
    }
    return result
}
