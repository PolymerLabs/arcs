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
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.data.Annotation
import arcs.core.data.AnnotationParam
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableAnnotation]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableAnnotationTest {

    @Test
    fun annotation_noParam_parcelableRoundTrip_works() {
        val annotation = Annotation("test")

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(annotation.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableAnnotation.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(annotation)
    }

    @Test
    fun annotation_multiParams_parcelableRoundTrip_works() {
        val annotation = Annotation(
            name = "test",
            params = mapOf(
                "str" to AnnotationParam.Str("abc"),
                "bool" to AnnotationParam.Bool(true),
                "num" to AnnotationParam.Num(123)
            )
        )

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(annotation.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            setDataPosition(0)
            readTypedObject(requireNotNull(ParcelableAnnotation.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(annotation)
    }
}
