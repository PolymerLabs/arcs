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

package arcs.android.crdt

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.util.writeProto
import arcs.core.data.util.toReferencable
import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferencablePrimitiveProtoTest {
  @Test
  fun parcelableRoundTrip_works_forBytes() {
    val primitive = 42.toByte().toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forChars() {
    val primitive = 'a'.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forNewlineChars() {
    val primitive = '\n'.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forCarriageReturnChars() {
    val primitive = '\r'.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forShorts() {
    val primitive = 1337.toShort().toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forInts() {
    val primitive = 1.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forLongs() {
    val primitive = 6000000000L.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forFloats() {
    val primitive = 1.0f.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forDoubles() {
    val primitive = 1.0.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forStrings() {
    val primitive = "This is a test".toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forStrings_withParenthesis() {
    val primitive = "This) ((is) a((()())( test(".toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forBooleans() {
    val primitive = true.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forByteArrays() {
    val primitive = ByteArray(10) { it.toByte() }.toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }
    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forBigInts() {
    val primitive = BigInt("100000000000000000000000000000000000000000001").toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forArcsDurations() {
    val primitive = ArcsDuration.ofMillis(1337).toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }

  @Test
  fun parcelableRoundTrip_works_forArcsInstants() {
    val primitive = ArcsInstant.ofEpochMilli(1337).toReferencable()

    val marshalled = with(Parcel.obtain()) {
      writeProto(primitive.toProto())
      marshall()
    }
    val unmarshalled = with(Parcel.obtain()) {
      unmarshall(marshalled, 0, marshalled.size)
      setDataPosition(0)
      readReferencablePrimitive()
    }

    assertThat(unmarshalled).isEqualTo(primitive)
  }
}
