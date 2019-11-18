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

package arcs.storage.parcelables

import android.os.Parcelable
import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.ProxyMessage

/** Defines parcelable variants of the [ProxyMessage]s. */
abstract class ParcelableProxyMessage(
    /** Identifier for the [ProxyMessage]. */
    open val id: Int?,
    /** Type of CRDT this message is intended for. */
    open val crdtType: ParcelableCrdtType,
    /** [Type] of the message. */
    internal open val type: ProxyMessage.Type
) : Parcelable {
    /** Converts the [Parcelable] [ProxyMessage] back into an actual [ProxyMessage] variant. */
    abstract fun <Data, Op, ConsumerData> actualize(): ProxyMessage<Data, Op, ConsumerData>
        where Data : CrdtData, Op : CrdtOperation

    companion object {
        /** Represents the absence of an [id] in a [ParcelableProxyMessage]. */
        const val NO_ID = -1
    }
}
