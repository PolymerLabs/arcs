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
import arcs.core.host.api.HandleHolder
import arcs.core.host.toParticleIdentifier
import arcs.sdk.HandleHolderBase
import arcs.sdk.Particle
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableParticleIdentifier]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableParticleIdentifierTest {
  class TestParticle : Particle {
    override val handles: HandleHolder = HandleHolderBase("TestParticle", emptyMap())
  }

  @Test
  fun data_parcelableRoundTrip_works() {
    val id = TestParticle::class.toParticleIdentifier()

    val marshalled = with(Parcel.obtain()) {
      writeTypedObject(id.toParcelable(), 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableParticleIdentifier.CREATOR))
    }

    assertThat(unmarshalled?.actual).isEqualTo(id)
    assertThat(unmarshalled?.describeContents()).isEqualTo(0)
  }

  @Test
  fun readTypedObject_emptyParcel_givesNull() {
    val emptyParcel = Parcel.obtain().apply { writeInt(0) /* empty values.. */ }
    val unmarshalled = with(Parcel.obtain()) {
      val marshalled = emptyParcel.marshall()
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readTypedObject(requireNotNull(ParcelableParticleIdentifier.CREATOR))
    }
    assertThat(unmarshalled).isNull()
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
      assertFailsWith<IllegalArgumentException>("no id found") {
        readTypedObject(requireNotNull(ParcelableParticleIdentifier.CREATOR))
      }
    }
  }

  @Test
  fun writeParticleIdentifier_roundTrip_works() {
    val id = TestParticle::class.toParticleIdentifier()
    var parcel = Parcel.obtain()
    parcel.writeParticleIdentifier(id, 0)
    parcel.setDataPosition(0)
    val recoveredId = parcel.readParticleIdentifier()
    assertThat(recoveredId).isEqualTo(id)
  }

  @Test
  fun array_parcelableRoundTrip_works() {
    val id = TestParticle::class.toParticleIdentifier().toParcelable()
    val arr = arrayOf(id, id)
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }

    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      createTypedArray(requireNotNull(ParcelableParticleIdentifier.CREATOR))
    }

    assertThat(unmarshalled?.size).isEqualTo(2)
    assertThat(unmarshalled?.get(0)?.actual).isEqualTo(id.actual)
  }

  @Test
  fun array_mismatchedContents_fails() {
    val id = TestParticle::class.toParticleIdentifier().toParcelable()
    val arr = arrayOf(id, id)
    val marshalled = with(Parcel.obtain()) {
      writeTypedArray(arr, 0)
      marshall()
    }
    // An array has been marshalled, but try to unmarshall to a single object
    with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      assertFailsWith<RuntimeException>("fail to read obj from array") {
        readTypedObject(requireNotNull(ParcelableParticleIdentifier.CREATOR))
      }
    }
  }
}
