/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.host.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.core.data.AnnotationParam

/** [Parcelable] variant of [AnnotationParam]. */
data class ParcelableAnnotationParam(
    override val actual: AnnotationParam
) : ActualParcelable<AnnotationParam> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual::class.simpleName)
        when (actual) {
            is AnnotationParam.Bool -> parcel.writeInt(if (actual.value) 1 else 0)
            is AnnotationParam.Str -> parcel.writeString(actual.value)
            is AnnotationParam.Num -> parcel.writeInt(actual.value)
        }
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableAnnotationParam> {
        override fun createFromParcel(parcel: Parcel): ParcelableAnnotationParam {
            val type = requireNotNull(parcel.readString()) {
                "No annotation param type found in Parcel"
            }
            return when (type) {
                "Bool" -> {
                    ParcelableAnnotationParam(
                        AnnotationParam.Bool(if (parcel.readInt() == 1) true else false)
                    )
                }
                "Str" -> {
                    ParcelableAnnotationParam(
                        AnnotationParam.Str(requireNotNull(parcel.readString()))
                    )
                }
                "Num" -> ParcelableAnnotationParam(AnnotationParam.Num(parcel.readInt()))
                else -> throw IllegalStateException("Annotation param type $type")
            }
        }

        override fun newArray(size: Int): Array<ParcelableAnnotationParam?> = arrayOfNulls(size)
    }
}

/** Wraps a [AnnotationParam] as a [ParcelableAnnotationParam]. */
fun AnnotationParam.toParcelable() = ParcelableAnnotationParam(this)

/** Writes a [AnnotationParam] to a [Parcel]. */
fun Parcel.writeAnnotationParam(param: AnnotationParam, flags: Int) {
    writeTypedObject(param.toParcelable(), flags)
}

/** Reads a [AnnotationParam] from a [Parcel]. */
fun Parcel.readAnnotationParam(): AnnotationParam? {
    return readTypedObject(ParcelableAnnotationParam)?.actual
}
