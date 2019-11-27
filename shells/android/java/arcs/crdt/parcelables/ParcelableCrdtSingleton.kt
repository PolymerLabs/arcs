package arcs.crdt.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.crdt.CrdtSet
import arcs.crdt.CrdtSingleton

object ParcelableCrdtSingleton {
    data class Data(
        override val actual: CrdtSingleton.Data<Referencable>
    ) : ParcelableCrdtData<CrdtSingleton.Data<Referencable>> {
        override var versionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeTypedObject(actual.versionMap.toParcelable(), flags)
            parcel.writeInt(actual.values.size)
            actual.values.forEach { (actor, value) ->
                parcel.writeString(actor)
                parcel.writeTypedObject(ParcelableCrdtSet.DataValue(value), flags)
            }
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel): Data {
                val versionMap = requireNotNull(
                    parcel.readTypedObject(ParcelableVersionMap.CREATOR)
                ) { "No VersionMap found in parcel when reading ParcelableCrdtSingleton.Data" }

                val values = mutableMapOf<ReferenceId, CrdtSet.DataValue<Referencable>>()
                val items = parcel.readInt()
                repeat(items) {
                    values[requireNotNull(parcel.readString())] =
                        requireNotNull(
                            parcel.readTypedObject(ParcelableCrdtSet.DataValue.CREATOR)
                        ) {
                            "No DataValue found in parcel when reading ParcelableCrdtSingleton.Data"
                        }.actual
                }

                return Data(CrdtSingleton.DataImpl(versionMap.actual, values))
            }

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

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
                parcel.writeTypedObject(actual.clock.toParcelable(), flags)
                parcel.writeTypedObject(actual.value.toParcelable(), flags)
            }

            companion object CREATOR : Parcelable.Creator<Update> {
                override fun createFromParcel(parcel: Parcel): Update {
                    val actor = requireNotNull(parcel.readString())
                    val clock = requireNotNull(parcel.readTypedObject(ParcelableVersionMap.CREATOR))
                    val value = requireNotNull(parcel.readReferencable())
                    return Update(CrdtSingleton.Operation.Update(actor, clock.actual, value))
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
                parcel.writeTypedObject(actual.clock.toParcelable(), flags)
            }

            companion object CREATOR : Parcelable.Creator<Clear> {
                override fun createFromParcel(parcel: Parcel): Clear {
                    val actor = requireNotNull(parcel.readString())
                    val clock = requireNotNull(parcel.readTypedObject(ParcelableVersionMap.CREATOR))
                    return Clear(CrdtSingleton.Operation.Clear(actor, clock.actual))
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

        override fun describeContents(): Int  = 0
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
