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
import arcs.core.data.AnnotationParam
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableAnnotationParam]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableAnnotationParamTest {

  @Test
  fun annotationParamString_parcelableRoundTrip_works() {
    val annotationParam = AnnotationParam.Str("string")

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(annotationParam.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableAnnotationParam.CREATOR))
    }

    val remarshalled = with(Parcel.obtain()) {
      writeTypedObject(unmarshalled, 0)
      marshall()
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(annotationParam)
    assertThat(remarshalled).isEqualTo(marshalled)
  }

  @Test
  fun annotationParamBool_parcelableRoundTrip_works() {
    val annotationParam = AnnotationParam.Bool(true)

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(annotationParam.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableAnnotationParam.CREATOR))
    }

    val remarshalled = with(Parcel.obtain()) {
      writeTypedObject(unmarshalled, 0)
      marshall()
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(annotationParam)
    assertThat(remarshalled).isEqualTo(marshalled)
  }

  @Test
  fun annotationParamNum_parcelableRoundTrip_works() {
    val annotationParam = AnnotationParam.Num(42)

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(annotationParam.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableAnnotationParam.CREATOR))
    }

    val remarshalled = with(Parcel.obtain()) {
      writeTypedObject(unmarshalled, 0)
      marshall()
    }

    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
    assertThat(unmarshalled?.actual).isEqualTo(annotationParam)
    assertThat(remarshalled).isEqualTo(marshalled)
  }

  @Test
  fun annotationParamNum_parcelableDirectRoundTrip_works() {
    val annotationParam = AnnotationParam.Num(42)

    // Repeat test above calling directly into serialization methods.
    val marshalled = with(Parcel.obtain()) {
      annotationParam.toParcelable().writeToParcel(this, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      ParcelableAnnotationParam.CREATOR.createFromParcel(this)
    }

    assertThat(unmarshalled.describeContents()).isEqualTo(0)
    assertThat(unmarshalled.actual).isEqualTo(annotationParam)
  }

  @Test
  fun readTypedObject_malformedWrongTypeParcel_fails() {
    val malformedParcel =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString("Bogus") // Should be one of "Str", "Bool", "Num"
        writeString("value")
      }

    malformedParcel.setDataPosition(0)
    assertFailsWith<IllegalStateException>("unknown annotation param type") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableAnnotationParam))
    }
  }

  @Test
  fun readTypedObject_malformedMissingTypeParcel_fails() {
    val malformedParcel =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
        writeString(null)
      }

    malformedParcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("no name found") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableAnnotationParam))
    }
  }

  @Test
  fun readTypedObject_malformedNoTypeParcel_fails() {
    val malformedParcel =
      Parcel.obtain().apply {
        writeInt(1) // Says value to come is non-empty.
      }

    malformedParcel.setDataPosition(0)
    assertFailsWith<IllegalArgumentException>("no name found") {
      malformedParcel.readTypedObject(requireNotNull(ParcelableAnnotationParam))
    }
  }

  @Test
  fun readTypedObject_emptyParcel_isNull() {
    val emptyParcel = Parcel.obtain()

    emptyParcel.setDataPosition(0)
    val unmarshalled = emptyParcel.readTypedObject(requireNotNull(ParcelableAnnotationParam))
    assertThat(unmarshalled).isEqualTo(null)
  }

  @Test
  fun array_parcelableRoundTrip_works() {
    val annotationParam = AnnotationParam.Str("string").toParcelable()
    val arr = arrayOf(annotationParam, annotationParam)
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableAnnotationParam.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(annotationParam.actual)
  }

  @Test
  fun emptyArray_parcelableRoundTrip_works() {
    val arr = arrayOf<ParcelableAnnotationParam>()
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableAnnotationParam.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(0)
  }

  @Test
  fun newArray_directCall_works() {
    val arr0 = ParcelableAnnotationParam.CREATOR.newArray(0)
    val arr1 = ParcelableAnnotationParam.CREATOR.newArray(1)
    val arr3 = ParcelableAnnotationParam.CREATOR.newArray(3)

    assertThat(arr0.size).isEqualTo(0)
    assertThat(arr1.size).isEqualTo(1)
    assertThat(arr3.size).isEqualTo(3)
    assertThat(arr1.get(0)).isEqualTo(null)
    assertThat(arr3.get(2)).isEqualTo(null)
  }
}
