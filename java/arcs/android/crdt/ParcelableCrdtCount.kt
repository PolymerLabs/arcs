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
import arcs.android.util.writeProto
import arcs.core.crdt.Actor
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.VersionMap

/** Container of [Parcelable] implementations for [CrdtCount]'s data and ops classes. */
object ParcelableCrdtCount {
    /**
     * Parcelable variant of [CrdtCount.Data].
     *
     * **Note:** There is no AIDL parcelable definition provided for this, because it is always
     * passed as a member of another class to an AIDL interface, not directly.
     */
    data class Data(
        override val actual: CrdtCount.Data
    ) : ParcelableCrdtData<CrdtCount.Data> {
        override var versionMap: VersionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            // Write the version map.
            parcel.writeProto(actual.versionMap.toProto())

            // Write the number of values as a hint of what to expect.
            parcel.writeInt(actual.values.size)
            // Write the actual values.
            actual.values.forEach { (actor, value) ->
                parcel.writeString(actor)
                parcel.writeInt(value)
            }
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel): Data {
                // Read the version map.
                val versionMap = requireNotNull(parcel.readVersionMap()) {
                    "No VersionMap found in parcel when reading ParcelableCrdtCountData"
                }
                val values = mutableMapOf<Actor, Int>()

                // Read the item count hint.
                val items = parcel.readInt()
                // Use the item count hint to read the values into the map.
                repeat(items) {
                    values[requireNotNull(parcel.readString())] = parcel.readInt()
                }

                return Data(CrdtCount.Data(values, versionMap))
            }

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /**
     * Parcelable variants of [CrdtCount.Operation].
     *
     * This class is implemented such that it serves as a multiplexed parcelable for its subclasses:
     *
     * During [writeToParcel], we write the ordinal value of the [OpType] before the subclasses
     * write their bodies.
     *
     * During [createFromParcel], we read the ordinal value of the [OpType] again, use that to find
     * the corresponding enum value, and multiplex down to the appropriate [createFromParcel] method
     * within the subclasses' [CREATOR]s.
     *
     * **Note:** There are no AIDL parcelable definition provided for these, because they are always
     * passed as members of another class to an AIDL interface, not directly.
     */
    sealed class Operation(
        private val opType: OpType
    ) : ParcelableCrdtOperation<CrdtCount.Operation> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            // Write the opType so we can multiplex during createFromParcel.
            parcel.writeInt(opType.ordinal)
        }

        /** Parcelable variant of [CrdtCount.Operation.Increment]. */
        data class Increment(
            override val actual: CrdtCount.Operation.Increment
        ) : Operation(OpType.Increment) {

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeString(actual.actor)
                parcel.writeInt(actual.version.first)
                parcel.writeInt(actual.version.second)
            }

            override fun describeContents(): Int = 0

            companion object CREATOR : Parcelable.Creator<Increment> {
                override fun createFromParcel(parcel: Parcel): Increment {
                    val actor = requireNotNull(parcel.readString())
                    val from = parcel.readInt()
                    val to = parcel.readInt()
                    return Increment(CrdtCount.Operation.Increment(actor, from to to))
                }

                override fun newArray(size: Int): Array<Increment?> = arrayOfNulls(size)
            }
        }

        /** Parcelable variant of [CrdtCount.Operation.MultiIncrement]. */
        data class MultiIncrement(
            override val actual: CrdtCount.Operation.MultiIncrement
        ) : Operation(OpType.MultiIncrement) {
            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeString(actual.actor)
                parcel.writeInt(actual.version.first)
                parcel.writeInt(actual.version.second)
                parcel.writeInt(actual.delta)
            }

            override fun describeContents(): Int = 0

            companion object CREATOR : Parcelable.Creator<MultiIncrement> {
                override fun createFromParcel(parcel: Parcel): MultiIncrement {
                    val actor = requireNotNull(parcel.readString())
                    val from = parcel.readInt()
                    val to = parcel.readInt()
                    val delta = parcel.readInt()
                    return MultiIncrement(
                        CrdtCount.Operation.MultiIncrement(actor, from to to, delta)
                    )
                }

                override fun newArray(size: Int): Array<MultiIncrement?> = arrayOfNulls(size)
            }
        }

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel): Operation =
                when (OpType.values()[parcel.readInt()]) {
                    OpType.Increment -> Increment.createFromParcel(parcel)
                    OpType.MultiIncrement -> MultiIncrement.createFromParcel(parcel)
                }

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }
    }

    /**
     * Identifiers for when [Operation] is reading from a parcelable, so it can multiplex out to the
     * correct subclass.
     */
    internal enum class OpType {
        Increment,
        MultiIncrement,
    }
}

/** Returns a [Parcelable] variant of the [CrdtCount.Data] object. */
fun CrdtCount.Data.toParcelable(): ParcelableCrdtData<CrdtCount.Data> =
    ParcelableCrdtCount.Data(this)

/** Converts a [CrdtCount.Operation] to a [Parcelable] variant. */
fun CrdtCount.Operation.toParcelable(): ParcelableCrdtOperation<CrdtCount.Operation> = when (this) {
    is CrdtCount.Operation.Increment -> ParcelableCrdtCount.Operation.Increment(this)
    is CrdtCount.Operation.MultiIncrement -> ParcelableCrdtCount.Operation.MultiIncrement(this)
}

/** Returns a list of [ParcelableCrdtOperation]s based on the list of [CrdtCount.Operation]s. */
fun List<CrdtCount.Operation>.toParcelables(): List<ParcelableCrdtOperation<CrdtCount.Operation>> =
    map { it.toParcelable() }
