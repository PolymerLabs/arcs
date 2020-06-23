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

import arcs.core.data.CapabilityNew.Ttl
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
        assertThat(CapabilitiesNew(CapabilityNew.Persistence.ON_DISK).isEmpty)
            .isFalse()
        assertThat(CapabilitiesNew(listOf(CapabilityNew.Persistence.ON_DISK)).isEmpty)
            .isFalse()
    }

    @Test
    fun capabilities_unique() {
        assertFailsWith<IllegalArgumentException> {
            CapabilitiesNew(listOf(Ttl.Days(1).toRange(), Ttl.Hours(3)))
        }
    }

    @Test
    fun capabilities_fromAnnotations_persistent() {
        val persistent =
            CapabilitiesNew.fromAnnotation(Annotation.createCapability("persistent"))
        assertThat(persistent.persistence).isEqualTo(CapabilityNew.Persistence.ON_DISK)
        assertThat(persistent.isEncrypted).isNull()
        assertThat(persistent.ttl).isNull()
        assertThat(persistent.isQueryable).isNull()
        assertThat(persistent.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_ttl() {
        val ttl30d = CapabilitiesNew.fromAnnotation(Annotation.createTtl("30d"))
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
        val tiedToRuntime = CapabilitiesNew.fromAnnotation(
            Annotation.createCapability("tiedToRuntime")
        )
        assertThat(tiedToRuntime.persistence).isEqualTo(CapabilityNew.Persistence.IN_MEMORY)
        assertThat(tiedToRuntime.isEncrypted).isNull()
        assertThat(tiedToRuntime.ttl).isNull()
        assertThat(tiedToRuntime.isQueryable).isNull()
        assertThat(tiedToRuntime.isShareable).isTrue()
    }

    @Test
    fun capabilities_contains() {
        val capabilities = CapabilitiesNew(
            listOf<CapabilityNew.Range>(
                CapabilityNew.Persistence.ON_DISK.toRange(),
                CapabilityNew.Range(CapabilityNew.Ttl.Days(30), CapabilityNew.Ttl.Hours(1)),
                CapabilityNew.Queryable(true).toRange()
            )
        )
        assertThat(capabilities.contains(CapabilityNew.Persistence.ON_DISK)).isTrue()
        assertThat(capabilities.contains(CapabilityNew.Persistence.UNRESTRICTED)).isFalse()
        assertThat(capabilities.contains(CapabilityNew.Persistence.IN_MEMORY)).isFalse()
        assertThat(capabilities.contains(CapabilityNew.Ttl.Minutes(15))).isFalse()
        assertThat(capabilities.contains(CapabilityNew.Ttl.Hours(2))).isTrue()
        assertThat(capabilities.contains(CapabilityNew.Ttl.Days(30))).isTrue()
        assertThat(
            capabilities.contains(
                CapabilityNew.Range(CapabilityNew.Ttl.Days(20), CapabilityNew.Ttl.Hours(15))
            )
        ).isTrue()
        assertThat(capabilities.contains(CapabilityNew.Queryable(true))).isTrue()
        assertThat(capabilities.contains(CapabilityNew.Queryable(false))).isFalse()
        assertThat(capabilities.contains(CapabilityNew.Encryption(true))).isFalse()
        assertThat(capabilities.contains(CapabilityNew.Encryption(false))).isFalse()

        assertThat(capabilities.containsAll(capabilities)).isTrue()
        assertThat(
            capabilities.containsAll(
                CapabilitiesNew(
                    listOf<CapabilityNew.Range>(
                        CapabilityNew.Persistence.ON_DISK.toRange(),
                        CapabilityNew.Ttl.Days(10).toRange()
                    )
                )
            )
        ).isTrue()
        assertThat(
            capabilities.containsAll(
                CapabilitiesNew(
                    listOf<CapabilityNew.Range>(
                        CapabilityNew.Ttl.Days(10).toRange(),
                        CapabilityNew.Shareable(true).toRange()
                    )
                )
            )
        ).isFalse()
        assertThat(
            capabilities.containsAll(
                CapabilitiesNew(listOf<CapabilityNew.Range>(CapabilityNew.Queryable.ANY))
            )
        ).isFalse()
    }
}
