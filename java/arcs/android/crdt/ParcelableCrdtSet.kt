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
import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSet

/** Container of [Parcelable] implementations for the data and ops classes of [CrdtSet]. */
object ParcelableCrdtSet {
    /** Parcelable variant of [CrdtSet.DataValue]. */
    data class DataValue(
        val actual: CrdtSet.DataValue<Referencable>
    ) : Parcelable {
        override fun describeContents(): Int = 0

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.versionMap.toProto())
            parcel.writeTypedObject(actual.value.toParcelable(), flags)
        }

        companion object CREATOR : Parcelable.Creator<DataValue> {
            override fun createFromParcel(parcel: Parcel): DataValue {
                val versionMap = requireNotNull(parcel.readVersionMap()) {
                    "VersionMap not found in parcel when reading ParcelableCrdtSet.DataValue"
                }
                val value = requireNotNull(parcel.readReferencable())
                return DataValue(CrdtSet.DataValue(versionMap, value))
            }

            override fun newArray(size: Int): Array<DataValue?> = arrayOfNulls(size)
        }
    }

    /** Parcelable variant of [CrdtSet.Data]. */
    data class Data(
        override val actual: CrdtSet.Data<Referencable>
    ) : ParcelableCrdtData<CrdtSet.Data<Referencable>> {
        override var versionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.versionMap.toProto())
            parcel.writeInt(actual.values.size)
            actual.values.forEach { (actor, value) ->
                parcel.writeString(actor)
                parcel.writeTypedObject(DataValue(value), flags)
            }
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel): Data {
                val versionMap = requireNotNull(parcel.readVersionMap()) {
                    "No VersionMap found in parcel when reading ParcelableCrdtSet.Data"
                }

                val values = mutableMapOf<ReferenceId, CrdtSet.DataValue<Referencable>>()
                val items = parcel.readInt()
                repeat(items) {
                    values[requireNotNull(parcel.readString())] =
                        requireNotNull(parcel.readTypedObject(DataValue)?.actual) {
                            "No DataValue found in parcel when reading ParcelableCrdtSet.Data"
                        }
                }

                return Data(CrdtSet.DataImpl(versionMap, values))
            }

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /**
     * Parcelable variants of [CrdtSet.Operation].
     *
     * This class is implemented such that it serves as a multiplexed parcelable for its subclasses.
     * We write the ordinal value of [OpType] first, before parceling the contents of the subclass.
     * The [OpType] is used to figure out the correct subtype when deserialising.
     */
    sealed class Operation(
        private val opType: OpType
    ) : ParcelableCrdtOperation<CrdtSet.Operation<Referencable>> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            // Write the opType so we can multiplex during createFromParcel.
            parcel.writeInt(opType.ordinal)
        }

        /** Parcelable variant of [CrdtSet.Operation.Add]. */
        data class Add(
            override val actual: CrdtSet.Operation.Add<Referencable>
        ) : Operation(OpType.Add) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeString(actual.actor)
                parcel.writeTypedObject(actual.added.toParcelable(), flags)
            }

            companion object CREATOR : Parcelable.Creator<Add> {
                override fun createFromParcel(parcel: Parcel): Add {
                    val clock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtSet.Operation.Add"
                        }
                    val actor = requireNotNull(parcel.readString())
                    val added = requireNotNull(parcel.readReferencable())
                    return Add(CrdtSet.Operation.Add(actor, clock, added))
                }

                override fun newArray(size: Int): Array<Add?> = arrayOfNulls(size)
            }
        }

        /** Parcelable variant of [CrdtSet.Operation.Remove]. */
        data class Remove(
            override val actual: CrdtSet.Operation.Remove<Referencable>
        ) : Operation(OpType.Remove) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeString(actual.actor)
                parcel.writeTypedObject(actual.removed.toParcelable(), flags)
            }

            companion object CREATOR : Parcelable.Creator<Remove> {
                override fun createFromParcel(parcel: Parcel): Remove {
                    val clock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtSet.Operation.Remove"
                        }
                    val actor = requireNotNull(parcel.readString())
                    val removed = requireNotNull(parcel.readReferencable())
                    return Remove(CrdtSet.Operation.Remove(actor, clock, removed))
                }

                override fun newArray(size: Int): Array<Remove?> = arrayOfNulls(size)
            }
        }

        /** Parcelable variant of [CrdtSet.Operation.FastForward]. */
        data class FastForward(
            override val actual: CrdtSet.Operation.FastForward<Referencable>
        ) : Operation(OpType.FastForward) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.oldClock.toProto())
                parcel.writeProto(actual.newClock.toProto())

                parcel.writeInt(actual.added.size)
                actual.added.forEach {
                    parcel.writeTypedObject(DataValue(it), flags)
                }

                parcel.writeInt(actual.removed.size)
                actual.removed.forEach {
                    parcel.writeTypedObject(it.toParcelable(), flags)
                }
            }

            companion object CREATOR : Parcelable.Creator<FastForward> {
                override fun createFromParcel(parcel: Parcel): FastForward {
                    val oldClock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtSet.Operation.FastForward"
                        }
                    val newClock = requireNotNull(parcel.readVersionMap())

                    val added = mutableListOf<CrdtSet.DataValue<Referencable>>()
                    val numAdded = parcel.readInt()
                    repeat(numAdded) {
                        added.add(requireNotNull(parcel.readTypedObject(DataValue)).actual)
                    }

                    val removed = mutableListOf<Referencable>()
                    val numRemoved = parcel.readInt()
                    repeat(numRemoved) {
                        removed.add(requireNotNull(parcel.readReferencable()))
                    }
                    return FastForward(
                        CrdtSet.Operation.FastForward(oldClock, newClock, added, removed))
                }

                override fun newArray(size: Int): Array<FastForward?> = arrayOfNulls(size)
            }
        }

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel): Operation =
                when (OpType.values()[parcel.readInt()]) {
                    OpType.Add -> Add.createFromParcel(parcel)
                    OpType.Remove -> Remove.createFromParcel(parcel)
                    OpType.FastForward -> FastForward.createFromParcel(parcel)
                }

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }
    }

    /** Identifiers for the subtypes of [Operation]. */
    internal enum class OpType {
        Add,
        Remove,
        FastForward,
    }
}

/** Returns a [Parcelable] variant of the [CrdtSet.Data] object. */
fun CrdtSet.Data<Referencable>.toParcelable(): ParcelableCrdtSet.Data =
    ParcelableCrdtSet.Data(this)

/** Returns a [Parcelable] variant of the [CrdtSet.Operation] object. */
fun CrdtSet.Operation<Referencable>.toParcelable():
    ParcelableCrdtOperation<CrdtSet.Operation<Referencable>> =
    when (this) {
        is CrdtSet.Operation.Add -> ParcelableCrdtSet.Operation.Add(this)
        is CrdtSet.Operation.Remove -> ParcelableCrdtSet.Operation.Remove(this)
        is CrdtSet.Operation.FastForward -> ParcelableCrdtSet.Operation.FastForward(this)
    }
