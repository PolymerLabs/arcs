package arcs.crdt.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.common.Referencable
import arcs.data.FieldName
import arcs.data.RawEntity

data class ParcelableRawEntity(
    override val actual: RawEntity
) : ParcelableReferencable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        super.writeToParcel(parcel, flags)
        parcel.writeString(actual.id)

        parcel.writeInt(actual.singletons.size)
        actual.singletons.forEach { (key, value) ->
            parcel.writeString(key)
            parcel.writeTypedObject(value?.let { ParcelableReferencable(it) }, flags)
        }

        parcel.writeInt(actual.collections.size)
        actual.collections.forEach { (key, set) ->
            parcel.writeString(key)
            parcel.writeInt(set.size)
            set.forEach {
                parcel.writeTypedObject(ParcelableReferencable(it), flags)
            }
        }
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableRawEntity> {
        override fun createFromParcel(parcel: Parcel): ParcelableRawEntity {
            val id = requireNotNull(parcel.readString())

            val singletons = mutableMapOf<FieldName, Referencable?>()
            val numSingletons = parcel.readInt()
            repeat(numSingletons) {
                singletons[requireNotNull(parcel.readString())] = parcel.readReferencable()
            }

            val collections = mutableMapOf<FieldName, Set<Referencable>>()
            val numCollections = parcel.readInt()
            repeat(numCollections) {
                val key = requireNotNull(parcel.readString())
                val numElements = parcel.readInt()
                val set = mutableSetOf<Referencable>()
                repeat(numElements) {
                    set.add(requireNotNull(parcel.readReferencable()))
                }
                collections[key] = set
            }

            val rawEntity = RawEntity(id, singletons, collections)
            return ParcelableRawEntity(rawEntity)
        }

        override fun newArray(size: Int): Array<ParcelableRawEntity?> = arrayOfNulls(size)
    }
}
