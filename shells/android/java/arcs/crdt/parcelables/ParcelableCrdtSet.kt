package arcs.crdt.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.crdt.CrdtSet

object ParcelableCrdtSet {
    data class DataValue(
        val actual: CrdtSet.DataValue<Referencable>
    ) : Parcelable {
        override fun describeContents(): Int = 0

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeTypedObject(ParcelableVersionMap(actual.versionMap), flags)
            parcel.writeTypedObject(ParcelableReferencable(actual.value), flags)
        }

        companion object CREATOR : Parcelable.Creator<DataValue> {
            override fun createFromParcel(parcel: Parcel): DataValue {
                val versionMap = parcel.readTypedObject(ParcelableVersionMap.CREATOR)!!.actual
                val value = requireNotNull(parcel.readReferencable())
                return DataValue(CrdtSet.DataValue(versionMap, value))
            }

            override fun newArray(size: Int): Array<DataValue?> = arrayOfNulls(size)
        }
    }

    data class Data(
        override val actual: CrdtSet.Data<Referencable>
    ) : ParcelableCrdtData<CrdtSet.Data<Referencable>> {
        override var versionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeTypedObject(ParcelableVersionMap(actual.versionMap), flags)
            parcel.writeInt(actual.values.size)
            actual.values.forEach { (actor, value) ->
                parcel.writeString(actor)
                parcel.writeTypedObject(DataValue(value), flags)
            }
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel): Data {
                val versionMap = requireNotNull(
                    parcel.readTypedObject(ParcelableVersionMap.CREATOR)
                ) { "No VersionMap found in parcel when reading ParcelableCrdtCountData" }

                val values = mutableMapOf<ReferenceId, CrdtSet.DataValue<Referencable>>()
                val items = parcel.readInt()
                repeat(items) {
                    values[requireNotNull(parcel.readString())] =
                        parcel.readTypedObject(DataValue.CREATOR)!!.actual
                }

                return Data(CrdtSet.DataImpl(versionMap.actual, values))
            }

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    sealed class Operation(
        private val opType: OpType
    ) : ParcelableCrdtOperation<CrdtSet.Operation<Referencable>> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            // Write the opType so we can multiplex during createFromParcel.
            parcel.writeInt(opType.ordinal)
        }

        data class Add(
            override val actual: CrdtSet.Operation.Add<Referencable>
        ) : Operation(OpType.Add) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeTypedObject(ParcelableVersionMap(actual.clock), flags)
                parcel.writeString(actual.actor)
                parcel.writeTypedObject(ParcelableReferencable(actual.added), flags)
            }

            companion object CREATOR : Parcelable.Creator<Add> {
                override fun createFromParcel(parcel: Parcel): Add {
                    val clock = parcel.readTypedObject(ParcelableVersionMap.CREATOR)!!.actual
                    val actor = requireNotNull(parcel.readString())
                    val added = requireNotNull(parcel.readReferencable())
                    return Add(CrdtSet.Operation.Add(clock, actor, added))
                }

                override fun newArray(size: Int): Array<Add?> = arrayOfNulls(size)
            }
        }

        data class Remove(
            override val actual: CrdtSet.Operation.Remove<Referencable>
        ) : Operation(OpType.Remove) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeTypedObject(ParcelableVersionMap(actual.clock), flags)
                parcel.writeString(actual.actor)
                parcel.writeTypedObject(ParcelableReferencable(actual.removed), flags)
            }

            companion object CREATOR : Parcelable.Creator<Remove> {
                override fun createFromParcel(parcel: Parcel): Remove {
                    val clock = parcel.readTypedObject(ParcelableVersionMap.CREATOR)!!.actual
                    val actor = requireNotNull(parcel.readString())
                    val removed = requireNotNull(parcel.readReferencable())
                    return Remove(CrdtSet.Operation.Remove(clock, actor, removed))
                }

                override fun newArray(size: Int): Array<Remove?> = arrayOfNulls(size)
            }
        }

        data class FastForward(
            override val actual: CrdtSet.Operation.FastForward<Referencable>
        ) : Operation(OpType.FastForward) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeTypedObject(ParcelableVersionMap(actual.oldClock), flags)
                parcel.writeTypedObject(ParcelableVersionMap(actual.newClock), flags)

                parcel.writeInt(actual.added.size)
                actual.added.forEach {
                    parcel.writeTypedObject(DataValue(it), flags)
                }

                parcel.writeInt(actual.removed.size)
                actual.removed.forEach {
                    parcel.writeTypedObject(ParcelableReferencable(it), flags)
                }
            }

            companion object CREATOR : Parcelable.Creator<FastForward> {
                override fun createFromParcel(parcel: Parcel): FastForward {
                    val oldClock = parcel.readTypedObject(ParcelableVersionMap.CREATOR)!!.actual
                    val newClock = parcel.readTypedObject(ParcelableVersionMap.CREATOR)!!.actual

                    val added = mutableListOf<CrdtSet.DataValue<Referencable>>()
                    val numAdded = parcel.readInt()
                    repeat(numAdded) {
                        added.add(parcel.readTypedObject(DataValue.CREATOR)!!.actual)
                    }

                    val removed = mutableListOf<Referencable>()
                    val numRemoved = parcel.readInt()
                    repeat(numRemoved) {
                        removed.add(requireNotNull(parcel.readReferencable()))
                    }
                    return FastForward(CrdtSet.Operation.FastForward(oldClock, newClock, added, removed))
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

    internal enum class OpType {
        Add,
        Remove,
        FastForward,
    }
}

fun CrdtSet.Data<Referencable>.toParcelable(): ParcelableCrdtSet.Data =
    ParcelableCrdtSet.Data(this)

fun CrdtSet.Operation<Referencable>.toParcelable(): ParcelableCrdtOperation<CrdtSet.Operation<Referencable>> =
    when (this) {
        is CrdtSet.Operation.Add -> ParcelableCrdtSet.Operation.Add(this)
        is CrdtSet.Operation.Remove -> ParcelableCrdtSet.Operation.Remove(this)
        is CrdtSet.Operation.FastForward -> ParcelableCrdtSet.Operation.FastForward(this)
    }
