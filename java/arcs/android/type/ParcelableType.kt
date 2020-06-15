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

package arcs.android.type

import android.os.Parcel
import android.os.Parcelable
import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.MuxType
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.data.TupleType
import arcs.core.data.TypeVariable
import arcs.core.type.Tag
import arcs.core.type.Type

/** Wrappers for [Type] classes which implements [Parcelable]. */
sealed class ParcelableType(open val actual: Type) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(actual.tag.ordinal)
        // Subclasses will write the remainder.
    }

    override fun describeContents(): Int = 0

    /** [Parcelable] variant of [arcs.core.data.CollectionType]. */
    data class CollectionType(
        override val actual: arcs.core.data.CollectionType<*>
    ) : ParcelableType(actual) {
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            super.writeToParcel(parcel, flags)
            parcel.writeType(actual.collectionType, flags)
        }

        companion object CREATOR : Parcelable.Creator<CollectionType> {
            override fun createFromParcel(parcel: Parcel): CollectionType =
                CollectionType(actual = CollectionType(requireNotNull(parcel.readType())))

            override fun newArray(size: Int): Array<CollectionType?> = arrayOfNulls(size)
        }
    }

    /** [Parcelable] variant of [arcs.core.data.CollectionType]. */
    data class CountType(
        override val actual: arcs.core.data.CountType = arcs.core.data.CountType()
    ) : ParcelableType(actual) {
        // No need to override writeToParcel.

        companion object CREATOR : Parcelable.Creator<CountType> {
            override fun createFromParcel(parcel: Parcel): CountType = CountType()
            override fun newArray(size: Int): Array<CountType?> = arrayOfNulls(size)
        }
    }

    /** [Parcelable] variant of [arcs.core.data.EntityType]. */
    data class EntityType(
        override val actual: arcs.core.data.EntityType
    ) : ParcelableType(actual) {
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            super.writeToParcel(parcel, flags)
            parcel.writeSchema(actual.entitySchema, flags)
        }

        companion object CREATOR : Parcelable.Creator<EntityType> {
            override fun createFromParcel(parcel: Parcel): EntityType =
                EntityType(actual = EntityType(requireNotNull(parcel.readSchema())))

            override fun newArray(size: Int): Array<EntityType?> = arrayOfNulls(size)
        }
    }

    data class MuxType(
        override val actual: arcs.core.data.MuxType<*>
    ) : ParcelableType(actual) {
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            super.writeToParcel(parcel, flags)
            parcel.writeType(actual.containedType, flags)
        }

        companion object CREATOR : Parcelable.Creator<MuxType> {
            override fun createFromParcel(parcel: Parcel): MuxType =
                MuxType(actual = MuxType(requireNotNull(parcel.readType())))

            override fun newArray(size: Int): Array<MuxType?> = arrayOfNulls(size)
        }
    }

    /** [Parcelable] variant of [arcs.core.data.ReferenceType]. */
    class ReferenceType(
        override val actual: arcs.core.data.ReferenceType<*>
    ) : ParcelableType(actual) {
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            super.writeToParcel(parcel, flags)
            parcel.writeType(actual.containedType, flags)
        }

        companion object CREATOR : Parcelable.Creator<ReferenceType> {
            override fun createFromParcel(parcel: Parcel): ReferenceType =
                ReferenceType(actual = ReferenceType(requireNotNull(parcel.readType())))

            override fun newArray(size: Int): Array<ReferenceType?> = arrayOfNulls(size)
        }
    }

    /** [Parcelable] variant of [arcs.core.data.SingletonType]. */
    data class SingletonType(
        override val actual: arcs.core.data.SingletonType<*>
    ) : ParcelableType(actual) {
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            super.writeToParcel(parcel, flags)
            parcel.writeType(actual.containedType, flags)
        }

        companion object CREATOR : Parcelable.Creator<SingletonType> {
            override fun createFromParcel(parcel: Parcel): SingletonType =
                SingletonType(
                    actual = SingletonType(requireNotNull(parcel.readType()))
                )

            override fun newArray(size: Int): Array<SingletonType?> = arrayOfNulls(size)
        }
    }

    /** [Parcelable] variant of [arcs.core.data.TupleType]. */
    class TupleType(
        override val actual: arcs.core.data.TupleType
    ) : ParcelableType(actual) {
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            super.writeToParcel(parcel, flags)
            parcel.writeInt(actual.elementTypes.size)
            for (element in actual.elementTypes) {
                parcel.writeType(element, flags)
            }
        }

        companion object CREATOR : Parcelable.Creator<TupleType> {
            override fun createFromParcel(parcel: Parcel): TupleType {
                val elements = mutableListOf<Type>()
                repeat(parcel.readInt()) {
                    elements.add(requireNotNull(parcel.readType()))
                }
                return TupleType(actual = TupleType(elements))
            }

            override fun newArray(size: Int): Array<TupleType?> = arrayOfNulls(size)
        }
    }

    /** [Parcelable] variant of [arcs.core.data.TypeVariable]. */
    data class TypeVariable(
        override val actual: arcs.core.data.TypeVariable
    ) : ParcelableType(actual) {
        override fun writeToParcel(parcel: Parcel, flags: Int) {
            super.writeToParcel(parcel, flags)
            parcel.writeString(actual.name)
        }

        companion object CREATOR : Parcelable.Creator<TypeVariable> {
            override fun createFromParcel(parcel: Parcel) = TypeVariable(
                actual = TypeVariable(requireNotNull(parcel.readString()))
            )

            override fun newArray(size: Int): Array<TypeVariable?> = arrayOfNulls(size)
        }
    }

    companion object CREATOR : Parcelable.Creator<ParcelableType> {
        override fun createFromParcel(parcel: Parcel): ParcelableType =
            when (Tag.values()[parcel.readInt()]) {
                Tag.Collection -> CollectionType.createFromParcel(parcel)
                Tag.Count -> CountType.createFromParcel(parcel)
                Tag.Entity -> EntityType.createFromParcel(parcel)
                Tag.Mux -> MuxType.createFromParcel(parcel)
                Tag.Reference -> ReferenceType.createFromParcel(parcel)
                Tag.Singleton -> SingletonType.createFromParcel(parcel)
                Tag.Tuple -> TupleType.createFromParcel(parcel)
                Tag.TypeVariable -> TypeVariable.createFromParcel(parcel)
            }

        override fun newArray(size: Int): Array<ParcelableType?> = arrayOfNulls(size)
    }
}

/** Converts a raw [Type] to its [ParcelableType] variant. */
fun Type.toParcelable(): ParcelableType = when (tag) {
    Tag.Collection -> ParcelableType.CollectionType(this as CollectionType<*>)
    Tag.Count -> ParcelableType.CountType(this as CountType)
    Tag.Entity -> ParcelableType.EntityType(this as EntityType)
    Tag.Mux -> ParcelableType.MuxType(this as MuxType<*>)
    Tag.Reference -> ParcelableType.ReferenceType(this as ReferenceType<*>)
    Tag.Singleton -> ParcelableType.SingletonType(this as SingletonType<*>)
    Tag.Tuple -> ParcelableType.TupleType(this as TupleType)
    Tag.TypeVariable -> ParcelableType.TypeVariable(this as TypeVariable)
}

/** Writes a [Type] to the [Parcel]. */
fun Parcel.writeType(type: Type, flags: Int) = writeTypedObject(type.toParcelable(), flags)

/** Reads a [Type] from the [Parcel]. */
fun Parcel.readType(): Type? = readTypedObject(ParcelableType)?.actual
