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
import arcs.android.util.readProto
import arcs.android.util.requireProto
import arcs.android.util.writeProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation

/** Writes [CrdtData] to the [Parcel]. */
fun Parcel.writeModelData(model: CrdtData?) {
    writeProto(model?.toProto())
}

/** Reads [CrdtData] from the [Parcel]. */
fun Parcel.readModelData(): CrdtData? =
    readProto(CrdtDataProto.getDefaultInstance())?.toData()

/** Writes a [CrdtOperation] to the [Parcel]. */
fun Parcel.writeOperation(operation: CrdtOperation) {
    writeProto(operation.toProto())
}

/** Reads a [CrdtOperation] from the [Parcel]. */
fun Parcel.readOperation(): CrdtOperation =
    requireProto(CrdtOperationProto.getDefaultInstance()) {
        "CrdtOperation stored in parcel was null."
    }.toOperation()

/** Writes a [List] of [CrdtOperation]s to the [Parcel]. */
fun Parcel.writeOperations(operations: List<CrdtOperation>) {
    writeInt(operations.size)
    operations.forEach { writeOperation(it) }
}

/** Reads a [List] of [CrdtOperation]s from the [Parcel]. */
fun Parcel.readOperations(): List<CrdtOperation> {
    val size = readInt()
    if (size == 0) return emptyList()
    val result = mutableListOf<CrdtOperation>()
    repeat(size) { index ->
        result += requireNotNull(readOperation()) {
            "Couldn't find CrdtOperation in list at index $index in Parcel, expected length: $size"
        }
    }
    return result
}
