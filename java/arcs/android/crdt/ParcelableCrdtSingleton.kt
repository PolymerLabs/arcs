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
import arcs.core.crdt.CrdtSingleton

/** Container of [Parcelable] implementations for the data and ops classes of [CrdtSingleton]. */
object ParcelableCrdtSingleton {

    /** Parcelable variant of [CrdtSingleton.Data]. */
    data class Data(
        override val actual: CrdtSingleton.Data<Referencable>
    ) : ParcelableCrdtData<CrdtSingleton.Data<Referencable>> {
        override var versionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.versionMap.toProto())
            parcel.writeInt(actual.values.size)
            actual.values.forEach { (actor, value) ->
                parcel.writeString(actor)
                parcel.writeTypedObject(ParcelableCrdtSet.DataValue(value), flags)
            }
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel): Data {
                val versionMap = requireNotNull(parcel.readVersionMap()) {
                    "No VersionMap found in parcel when reading ParcelableCrdtSingleton.Data"
                }

                val values = mutableMapOf<ReferenceId, CrdtSet.DataValue<Referencable>>()
                val items = parcel.readInt()
                repeat(items) {
                    values[requireNotNull(parcel.readString())] =
                        requireNotNull(
                            parcel.readTypedObject(ParcelableCrdtSet.DataValue)?.actual
                        ) {
                            "No DataValue found in parcel when reading ParcelableCrdtSingleton.Data"
                        }
                }

                return Data(CrdtSingleton.DataImpl(versionMap, values))
            }

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /**
     * Parcelable variants of [CrdtSingleton.Operation].
     *
     * This class is implemented such that it serves as a multiplexed parcelable for its subclasses.
     * We write the ordinal value of [OpType] first, before parceling the contents of the subclass.
     * The [OpType] is used to figure out the correct subtype when deserialising.
     */
    sealed class Operation(
        private val opType: OpType
    ) : ParcelableCrdtOperation<CrdtSingleton.Operation<Referencable>> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            // Write the opType so we can multiplex during createFromParcel.
            parcel.writeInt(opType.ordinal)
        }

        data class Update(
            override val actual: CrdtSingleton.Operation.Update<Referencable>
        ) : Operation(OpType.Update) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeString(actual.actor)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeTypedObject(actual.value.toParcelable(), flags)
            }

            companion object CREATOR : Parcelable.Creator<Update> {
                override fun createFromParcel(parcel: Parcel): Update {
                    val actor = requireNotNull(parcel.readString())
                    val clock = requireNotNull(parcel.readVersionMap())
                    val value = requireNotNull(parcel.readReferencable())
                    return Update(CrdtSingleton.Operation.Update(actor, clock, value))
                }

                override fun newArray(size: Int): Array<Update?> = arrayOfNulls(size)
            }
        }

        data class Clear(
            override val actual: CrdtSingleton.Operation.Clear<Referencable>
        ) : Operation(OpType.Clear) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeString(actual.actor)
                parcel.writeProto(actual.clock.toProto())
            }

            companion object CREATOR : Parcelable.Creator<Clear> {
                override fun createFromParcel(parcel: Parcel): Clear {
                    val actor = requireNotNull(parcel.readString())
                    val clock = requireNotNull(parcel.readVersionMap())
                    return Clear(CrdtSingleton.Operation.Clear(actor, clock))
                }

                override fun newArray(size: Int): Array<Clear?> = arrayOfNulls(size)
            }
        }

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel): Operation =
                when (OpType.values()[parcel.readInt()]) {
                    OpType.Update -> Update.createFromParcel(parcel)
                    OpType.Clear -> Clear.createFromParcel(parcel)
                }

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }

        override fun describeContents(): Int = 0
    }

    /** Identifiers for the subtypes of [Operation]. */
    internal enum class OpType {
        Update,
        Clear
    }
}

/** Returns a [Parcelable] variant of the [CrdtSingleton.Data] object. */
fun CrdtSingleton.Data<Referencable>.toParcelable(): ParcelableCrdtSingleton.Data =
    ParcelableCrdtSingleton.Data(this)

/** Returns a [Parcelable] variant of the [CrdtSingleton.Operation] object. */
fun CrdtSingleton.Operation<Referencable>.toParcelable():
    ParcelableCrdtOperation<CrdtSingleton.Operation<Referencable>> =
    when (this) {
        is CrdtSingleton.Operation.Update -> ParcelableCrdtSingleton.Operation.Update(this)
        is CrdtSingleton.Operation.Clear -> ParcelableCrdtSingleton.Operation.Clear(this)
    }
