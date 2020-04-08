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
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.FieldName

/** Container of [Parcelable] implementations for the data and ops classes of [CrdtEntity]. */
object ParcelableCrdtEntity {

    /** Parcelable variant of [CrdtEntity.Data]. */
    data class Data(
        override val actual: CrdtEntity.Data
    ) : ParcelableCrdtData<CrdtEntity.Data> {
        override var versionMap = actual.versionMap

        @Suppress("UNCHECKED_CAST")
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.versionMap.toProto())

            parcel.writeInt(actual.singletons.size)
            actual.singletons.forEach { (field, value) ->
                parcel.writeString(field)
                parcel.writeTypedObject(
                    (value.data as CrdtSingleton.Data<Referencable>).toParcelable(),
                    flags
                )
            }

            parcel.writeInt(actual.collections.size)
            actual.collections.forEach { (field, value) ->
                parcel.writeString(field)
                parcel.writeTypedObject(
                    (value.data as CrdtSet.Data<Referencable>).toParcelable(),
                    flags
                )
            }
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            @Suppress("UNCHECKED_CAST")
            override fun createFromParcel(parcel: Parcel): Data {
                val versionMap = requireNotNull(parcel.readVersionMap()) {
                    "No VersionMap found in parcel when reading ParcelableCrdtEntity.Data"
                }

                val singletons = mutableMapOf<FieldName, CrdtSingleton<CrdtEntity.Reference>>()
                val numSingletons = parcel.readInt()
                repeat(numSingletons) {
                    val field = requireNotNull(parcel.readString())
                    val data = requireNotNull(
                        parcel.readTypedObject(ParcelableCrdtSingleton.Data)?.actual
                    )
                    singletons[field] = CrdtSingleton.createWithData(
                        data as CrdtSingleton.Data<CrdtEntity.Reference>
                    )
                }

                val collections = mutableMapOf<FieldName, CrdtSet<CrdtEntity.Reference>>()
                val numCollections = parcel.readInt()
                repeat(numCollections) {
                    val field = requireNotNull(parcel.readString())
                    val data = requireNotNull(
                        parcel.readTypedObject(ParcelableCrdtSingleton.Data)?.actual
                    )
                    collections[field] =
                        CrdtSet.createWithData(data as CrdtSet.Data<CrdtEntity.Reference>)
                }

                return Data(CrdtEntity.Data(versionMap, singletons, collections))
            }

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /**
     * Parcelable variants of [CrdtEntity.Operation].
     *
     * This class is implemented such that it serves as a multiplexed parcelable for its subclasses.
     * We write the ordinal value of [OpType] first, before parceling the contents of the subclass.
     * The [OpType] is used to figure out the correct subtype when deserialising.
     */
    sealed class Operation(
        private val opType: OpType
    ) : ParcelableCrdtOperation<CrdtEntity.Operation> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            // Write the opType so we can multiplex during createFromParcel.
            parcel.writeInt(opType.ordinal)
        }

        /** Parcelable variant of [CrdtEntity.Operation.SetSingleton]. */
        data class SetSingleton(
            override val actual: CrdtEntity.Operation.SetSingleton
        ) : Operation(OpType.SetSingleton) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeString(actual.actor)
                parcel.writeString(actual.field)
                parcel.writeProto(actual.value.toProto())
            }

            companion object CREATOR : Parcelable.Creator<SetSingleton> {
                override fun createFromParcel(parcel: Parcel): SetSingleton {
                    val clock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtEntity.Operation.SetSingleton"
                        }
                    val actor = requireNotNull(parcel.readString())
                    val field = requireNotNull(parcel.readString())
                    val value = requireNotNull(parcel.readReferencable()) as CrdtEntity.Reference
                    return SetSingleton(
                        CrdtEntity.Operation.SetSingleton(actor, clock, field, value)
                    )
                }

                override fun newArray(size: Int): Array<SetSingleton?> = arrayOfNulls(size)
            }
        }

        /** Parcelable variant of [CrdtEntity.Operation.ClearSingleton]. */
        data class ClearSingleton(
            override val actual: CrdtEntity.Operation.ClearSingleton
        ) : Operation(OpType.ClearSingleton) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeString(actual.actor)
                parcel.writeString(actual.field)
            }

            companion object CREATOR : Parcelable.Creator<ClearSingleton> {
                override fun createFromParcel(parcel: Parcel): ClearSingleton {
                    val clock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtEntity.Operation.ClearSingleton"
                        }
                    val actor = requireNotNull(parcel.readString())
                    val field = requireNotNull(parcel.readString())
                    return ClearSingleton(CrdtEntity.Operation.ClearSingleton(actor, clock, field))
                }

                override fun newArray(size: Int): Array<ClearSingleton?> = arrayOfNulls(size)
            }
        }

        /** Parcelable variant of [CrdtEntity.Operation.AddToSet]. */
        data class AddToSet(
            override val actual: CrdtEntity.Operation.AddToSet
        ) : Operation(OpType.AddToSet) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeString(actual.actor)
                parcel.writeString(actual.field)
                parcel.writeProto(actual.added.toProto())
            }

            companion object CREATOR : Parcelable.Creator<AddToSet> {
                override fun createFromParcel(parcel: Parcel): AddToSet {
                    val clock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtEntity.Operation.AddToSet"
                        }
                    val actor = requireNotNull(parcel.readString())
                    val field = requireNotNull(parcel.readString())
                    val added = requireNotNull(parcel.readReferencable()) as CrdtEntity.Reference
                    return AddToSet(CrdtEntity.Operation.AddToSet(actor, clock, field, added))
                }

                override fun newArray(size: Int): Array<AddToSet?> = arrayOfNulls(size)
            }
        }

        /** Parcelable variant of [CrdtEntity.Operation.RemoveFromSet]. */
        data class RemoveFromSet(
            override val actual: CrdtEntity.Operation.RemoveFromSet
        ) : Operation(OpType.RemoveFromSet) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeString(actual.actor)
                parcel.writeString(actual.field)
                parcel.writeProto(actual.removed.toProto())
            }

            companion object CREATOR : Parcelable.Creator<RemoveFromSet> {
                override fun createFromParcel(parcel: Parcel): RemoveFromSet {
                    val clock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtEntity.Operation.RemoveFromSet"
                        }
                    val actor = requireNotNull(parcel.readString())
                    val field = requireNotNull(parcel.readString())
                    val removed = requireNotNull(parcel.readReferencable()) as CrdtEntity.Reference
                    return RemoveFromSet(
                        CrdtEntity.Operation.RemoveFromSet(actor, clock, field, removed)
                    )
                }

                override fun newArray(size: Int): Array<RemoveFromSet?> = arrayOfNulls(size)
            }
        }

        /** Parcelable variant of [CrdtEntity.Operation.ClearAll]. */
        data class ClearAll(
            override val actual: CrdtEntity.Operation.ClearAll
        ) : Operation(OpType.ClearAll) {
            override fun describeContents(): Int = 0

            override fun writeToParcel(parcel: Parcel, flags: Int) {
                super.writeToParcel(parcel, flags)
                parcel.writeProto(actual.clock.toProto())
                parcel.writeString(actual.actor)
            }

            companion object CREATOR : Parcelable.Creator<ClearAll> {
                override fun createFromParcel(parcel: Parcel): ClearAll {
                    val clock =
                        requireNotNull(parcel.readVersionMap()) {
                            "VersionMap not found in parcel when reading " +
                                "ParcelableCrdtEntity.Operation.ClearAll"
                        }
                    val actor = requireNotNull(parcel.readString())
                    return ClearAll(CrdtEntity.Operation.ClearAll(actor, clock))
                }

                override fun newArray(size: Int): Array<ClearAll?> = arrayOfNulls(size)
            }
        }

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel): Operation =
                when (OpType.values()[parcel.readInt()]) {
                    OpType.SetSingleton -> SetSingleton.createFromParcel(parcel)
                    OpType.ClearSingleton -> ClearSingleton.createFromParcel(parcel)
                    OpType.AddToSet -> AddToSet.createFromParcel(parcel)
                    OpType.RemoveFromSet -> RemoveFromSet.createFromParcel(parcel)
                    OpType.ClearAll -> ClearAll.createFromParcel(parcel)
                }

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }

        override fun describeContents(): Int = 0
    }

    internal enum class OpType {
        SetSingleton,
        ClearSingleton,
        AddToSet,
        RemoveFromSet,
        ClearAll,
    }
}

/** Returns a [Parcelable] variant of the [CrdtEntity.Data] object. */
fun CrdtEntity.Data.toParcelable(): ParcelableCrdtEntity.Data =
    ParcelableCrdtEntity.Data(this)

/** Returns a [Parcelable] variant of the [CrdtEntity.Operation] object. */
fun CrdtEntity.Operation.toParcelable():
    ParcelableCrdtOperation<CrdtEntity.Operation> =
    when (this) {
        is CrdtEntity.Operation.SetSingleton -> ParcelableCrdtEntity.Operation.SetSingleton(this)
        is CrdtEntity.Operation.ClearSingleton ->
            ParcelableCrdtEntity.Operation.ClearSingleton(this)
        is CrdtEntity.Operation.AddToSet -> ParcelableCrdtEntity.Operation.AddToSet(this)
        is CrdtEntity.Operation.RemoveFromSet -> ParcelableCrdtEntity.Operation.RemoveFromSet(this)
        is CrdtEntity.Operation.ClearAll -> ParcelableCrdtEntity.Operation.ClearAll(this)
    }
