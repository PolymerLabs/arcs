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

package arcs.crdt.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.crdt.CrdtCount
import arcs.crdt.CrdtData
import arcs.crdt.CrdtEntity
import arcs.crdt.CrdtOperation
import arcs.crdt.CrdtOperationAtTime
import arcs.crdt.CrdtSet
import arcs.crdt.CrdtSingleton

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
fun Parcel.writeModelData(model: CrdtData?, flags: Int) {
    when (model) {
        is CrdtCount.Data ->
            writeTypedObject((model as? CrdtCount.Data)?.toParcelable(), flags)
        is CrdtSet.Data<*> ->
            TODO("Implement me when ParcelableSet is ready")
        is CrdtSingleton.Data<*> ->
            TODO("Implement me when ParcelableSingleton is ready")
        is CrdtEntity.Data ->
            TODO("Implement me when ParcelableEntity is ready")
    }
}

/** Reads [CrdtData] from the [Parcel], using the [expectedType] as a hint. */
fun Parcel.readModelData(expectedType: ParcelableCrdtType): CrdtData? =
    readTypedObject(
        requireNotNull(expectedType.crdtDataCreator) {
            "No crdtDataCreator for type $expectedType"
        }
    )?.actual
