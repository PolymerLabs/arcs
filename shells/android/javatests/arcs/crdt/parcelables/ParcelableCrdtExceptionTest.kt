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

package arcs.crdt.parcelables

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.crdt.CrdtException
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableCrdtException]. */
@RunWith(AndroidJUnit4::class)
class ParcelableCrdtExceptionTest {
    @Test
    fun parcelableRoundTrip_works() {
        val exception: CrdtException
        try {
            throw CrdtException("Uh oh")
        } catch (e: CrdtException) {
            exception = e
        }

        val marshalled = with(Parcel.obtain()) {
            writeParcelable(exception.toParcelable(), 0)
            marshall()
        }

        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readParcelable<ParcelableCrdtException>(ParcelableCrdtException::class.java.classLoader)
        }

        assertThat(unmarshalled?.message).isEqualTo("Uh oh")
        assertThat(unmarshalled?.stackTrace).isEqualTo(exception.stackTrace.toStrings())
    }
}
