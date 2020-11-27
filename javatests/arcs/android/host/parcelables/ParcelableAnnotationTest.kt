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
import kotlin.test.assertFailsWith
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

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
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

  @Test
  fun readTypedObject_malformedParcel_fails() {
    val malformedParcel =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString(null)
      }

    with(Parcel.obtain()) {
      val marshalled = malformedParcel.marshall()
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      assertFailsWith<IllegalArgumentException>("no name found") {
        readTypedObject(requireNotNull(ParcelableAnnotation))
      }
    }
  }

  @Test
  fun writeAnnotation_roundTrip_works() {
    val annotation = Annotation(
      name = "test",
      params = mapOf(
        "str" to AnnotationParam.Str("abc"),
        "bool" to AnnotationParam.Bool(true),
        "num" to AnnotationParam.Num(123)
      )
    )
    var parcel = Parcel.obtain()
    parcel.writeAnnotation(annotation, 0)
    parcel.setDataPosition(0)
    val recovered = parcel.readAnnotation()
    assertThat(recovered).isEqualTo(annotation)
  }

  @Test
  fun array_parcelableRoundTrip_works() {
    val annotation = Annotation(
      name = "test",
      params = mapOf(
        "str" to AnnotationParam.Str("abc")
      )
    ).toParcelable()
    val arr = arrayOf(annotation, annotation)
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableAnnotation.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(annotation.actual)
  }

  @Test
  fun readAnnotations_malformedArray_fails() {
    val malformed = with(Parcel.obtain()) {
      writeInt(1) // Says value to come is non-empty.
      writeString(null)
      marshall()
    }

    with(Parcel.obtain()) {
      unmarshall(malformed, 0, malformed.size)
      setDataPosition(0)
      assertFailsWith<RuntimeException>("malformed array") {
        readAnnotations()
      }
    }
  }
}
