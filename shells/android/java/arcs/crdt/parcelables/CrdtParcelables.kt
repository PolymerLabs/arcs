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
import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.crdt.CrdtOperationAtTime

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
