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
import arcs.android.crdt.ParcelableReferencable.Type
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.Reference
import javax.annotation.OverridingMethodsMustInvokeSuper

/**
 * Parcelable variant of the [Referencable] interface.
 *
 * All subclasses of [Referencable] need to have their own [Parcelable] implementation. [Type] is
 * used to identify which subclass is being parceled.
 */
interface ParcelableReferencable : Parcelable {
    val actual: Referencable

    /** Indicates which subclass of [ParcelableReferencable] is being parceled. */
    enum class Type(val creator: Parcelable.Creator<out ParcelableReferencable>) : Parcelable {
        // TODO: Add other ParcelableReferencable subclasses.
        RawEntity(ParcelableRawEntity.CREATOR),
        CrdtEntityReferenceImpl(ParcelableCrdtEntity.ReferenceImpl),
        StorageReferenceImpl(ParcelableReference.CREATOR),
        Primitive(ParcelableReferencablePrimitive.CREATOR);

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeInt(ordinal)
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Type> {
            override fun createFromParcel(parcel: Parcel): Type = values()[parcel.readInt()]

            override fun newArray(size: Int): Array<Type?> = arrayOfNulls(size)
        }
    }

    @OverridingMethodsMustInvokeSuper
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeTypedObject(
            when (this) {
                // TODO: Add other ParcelableReferencable subclasses.
                is ParcelableRawEntity -> Type.RawEntity
                is ParcelableCrdtEntity.ReferenceImpl -> Type.CrdtEntityReferenceImpl
                is ParcelableReference -> Type.StorageReferenceImpl
                is ParcelableReferencablePrimitive -> Type.Primitive
                else -> throw IllegalArgumentException(
                    "Unsupported Referencable type: ${this.javaClass}"
                )
            },
            flags
        )
    }

    override fun describeContents(): Int = 0

    companion object {
        operator fun invoke(actual: Referencable): ParcelableReferencable = when (actual) {
            // TODO: Add other ParcelableReferencable subclasses.
            is RawEntity -> ParcelableRawEntity(actual)
            is Reference -> ParcelableReference(actual)
            is CrdtEntity.ReferenceImpl -> ParcelableCrdtEntity.ReferenceImpl(actual)
            is ReferencablePrimitive<*> -> ParcelableReferencablePrimitive(actual)
            else ->
                throw IllegalArgumentException("Unsupported Referencable type: ${actual.javaClass}")
        }

        object CREATOR : Parcelable.Creator<ParcelableReferencable> {
            override fun createFromParcel(parcel: Parcel): ParcelableReferencable {
                val type = requireNotNull(parcel.readTypedObject(Type))
                return type.creator.createFromParcel(parcel)
            }

            override fun newArray(size: Int): Array<ParcelableReferencable?> = arrayOfNulls(size)
        }
    }
}

/** Converts a [Referencable] into a [ParcelableReferencable]. */
fun Referencable.toParcelable(): ParcelableReferencable = ParcelableReferencable(this)

/** Reads a [Referencable] from the [Parcel]. */
fun Parcel.readReferencable(): Referencable? =
    readTypedObject(ParcelableReferencable.Companion.CREATOR)?.actual
