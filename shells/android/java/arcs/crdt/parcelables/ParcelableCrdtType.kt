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

import android.os.Parcelable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation

/** Enumeration of the parcelable [CrdtModel] types. */
enum class ParcelableCrdtType(
    /** [Parcelable.Creator] for the type's [ParcelableCrdtData] class. */
    val crdtDataCreator: Parcelable.Creator<out ParcelableCrdtData<out CrdtData>>,
    /** [Parcelable.Creator] for the type's [ParcelableCrdtOperation] classes. */
    val crdtOperationCreator: Parcelable.Creator<out ParcelableCrdtOperation<out CrdtOperation>>
) {
    Count(ParcelableCrdtCount.Data.CREATOR, ParcelableCrdtCount.Operation.CREATOR),
    Set(ParcelableCrdtSet.Data.CREATOR, ParcelableCrdtSet.Operation.CREATOR),
    Singleton(ParcelableCrdtSingleton.Data.CREATOR, ParcelableCrdtSingleton.Operation.CREATOR),
    Entity(ParcelableCrdtEntity.Data.CREATOR, ParcelableCrdtEntity.Operation.CREATOR),
}
