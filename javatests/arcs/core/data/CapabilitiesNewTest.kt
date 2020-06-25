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

package arcs.core.data

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class CapabilitiesNewTest {
    @Test
    fun capabilities_empty() {
        assertThat(CapabilitiesNew().isEmpty).isTrue()
        assertThat(CapabilitiesNew.fromAnnotations(emptyList<Annotation>()).isEmpty).isTrue()
        assertThat(CapabilitiesNew(listOf(CapabilityNew.Persistence.ON_DISK)).isEmpty)
            .isFalse()
    }

    @Test
    fun capabilities_unique() {
        assertFailsWith<IllegalArgumentException> {
            CapabilitiesNew(listOf(CapabilityNew.Ttl.Days(1).toRange(), CapabilityNew.Ttl.Hours(3)))
        }
    }

    @Test
    fun capabilities_fromAnnotations_persistent() {
        val persistent =
            CapabilitiesNew.fromAnnotations(listOf(Annotation.createCapability("persistent")))
        assertThat(persistent.persistence).isEqualTo(CapabilityNew.Persistence.ON_DISK)
        assertThat(persistent.isEncrypted).isNull()
        assertThat(persistent.ttl).isNull()
        assertThat(persistent.isQueryable).isNull()
        assertThat(persistent.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_ttl() {
        val ttl30d = CapabilitiesNew.fromAnnotations(listOf(Annotation.createTtl("30d")))
        assertThat(ttl30d.persistence).isNull()
        assertThat(ttl30d.isEncrypted).isNull()
        assertThat(ttl30d.ttl).isEqualTo(CapabilityNew.Ttl.Days(30))
        assertThat(ttl30d.isQueryable).isNull()
        assertThat(ttl30d.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_persistentAndTtl() {
        val persistentAndTtl30d = CapabilitiesNew.fromAnnotations(
            listOf(
                Annotation.createCapability("persistent"),
                Annotation.createTtl("30d")
            )
        )
        assertThat(persistentAndTtl30d.persistence).isEqualTo(CapabilityNew.Persistence.ON_DISK)
        assertThat(persistentAndTtl30d.isEncrypted).isNull()
        assertThat(persistentAndTtl30d.ttl).isEqualTo(CapabilityNew.Ttl.Days(30))
        assertThat(persistentAndTtl30d.isQueryable).isNull()
        assertThat(persistentAndTtl30d.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_queryableAndEncrypted() {
        val queryableEncrypted = CapabilitiesNew.fromAnnotations(
            listOf(
                Annotation.createCapability("encrypted"),
                Annotation.createCapability("queryable")
            )
        )
        assertThat(queryableEncrypted.persistence).isNull()
        assertThat(queryableEncrypted.isEncrypted).isTrue()
        assertThat(queryableEncrypted.ttl).isNull()
        assertThat(queryableEncrypted.isQueryable).isTrue()
        assertThat(queryableEncrypted.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_tiedToRuntimeAndTtl() {
        val tiedToRuntime = CapabilitiesNew.fromAnnotations(
            listOf(Annotation.createCapability("tiedToRuntime"))
        )
        assertThat(tiedToRuntime.persistence).isEqualTo(CapabilityNew.Persistence.IN_MEMORY)
        assertThat(tiedToRuntime.isEncrypted).isNull()
        assertThat(tiedToRuntime.ttl).isNull()
        assertThat(tiedToRuntime.isQueryable).isNull()
        assertThat(tiedToRuntime.isShareable).isTrue()
    }
}
