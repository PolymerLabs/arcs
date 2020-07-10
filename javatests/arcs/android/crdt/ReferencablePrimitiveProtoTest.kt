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
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.util.writeProto
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferencablePrimitiveProtoTest {
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
}
