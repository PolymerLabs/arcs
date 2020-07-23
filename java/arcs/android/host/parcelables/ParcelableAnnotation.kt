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
import arcs.core.data.Annotation

/** [Parcelable] variant of [Annotation]. */
data class ParcelableAnnotation(override val actual: Annotation) : ActualParcelable<Annotation> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.name)
        parcel.writeMap(
            actual.params.mapValues { ParcelableAnnotationParam(it.value) }
        )
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableAnnotation> {
        override fun createFromParcel(parcel: Parcel): ParcelableAnnotation {
            val name = requireNotNull(parcel.readString()) {
                "No annotation name found in Parcel"
            }
            val params = mutableMapOf<String, ParcelableAnnotationParam>()
            parcel.readMap(params as Map<*, *>, this::class.java.classLoader)
            return ParcelableAnnotation(Annotation(name, params.mapValues { it.value.actual }))
        }

        override fun newArray(size: Int): Array<ParcelableAnnotation?> =
            arrayOfNulls(size)
    }
}

/** Wraps a [Annotation] as a [ParcelableAnnotation]. */
fun Annotation.toParcelable(): ParcelableAnnotation = ParcelableAnnotation(this)

/** Writes a [Annotation] to a [Parcel]. */
fun Parcel.writeAnnotation(annotation: Annotation, flags: Int) =
    writeTypedObject(annotation.toParcelable(), flags)

/** Writes a [Annotation] to a [Parcel]. */
fun Parcel.writeAnnotations(annotations: List<Annotation>, flags: Int) {
    writeInt(annotations.size)
    annotations.forEach { writeTypedObject(it.toParcelable(), flags) }
}

/** Reads a [Annotation] from a [Parcel]. */
fun Parcel.readAnnotation(): Annotation? =
    readTypedObject(ParcelableAnnotation)?.actual

/** Reads a [Annotation] from a [Parcel]. */
fun Parcel.readAnnotations(): List<Annotation> {
    val size = requireNotNull(readInt()) {
        "No size of Annotations found in Parcel"
    }
    val annotations = mutableListOf<Annotation>()

    repeat(size) {
        annotations.add(
            requireNotNull(readAnnotation()) {
                "No Annotation found in list position $it of parcel."
            }
        )
    }
    return annotations
}
