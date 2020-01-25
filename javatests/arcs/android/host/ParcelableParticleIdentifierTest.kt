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

package arcs.android.host

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.host.ParticleIdentifier
import arcs.core.sdk.Particle
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableParticleIdentifier]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableParticleIdentifierTest {
    class TestParticle : Particle

    @Test
    fun data_parcelableRoundTrip_works() {
        val id = ParticleIdentifier.from(TestParticle::class)

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
    }
}
