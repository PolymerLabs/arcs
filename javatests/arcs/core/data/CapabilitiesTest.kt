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

import arcs.core.data.Capability.Encryption
import arcs.core.data.Capability.Persistence
import arcs.core.data.Capability.Ttl
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class CapabilitiesTest {
    @Test
    fun capabilities_empty() {
        assertThat(Capabilities().isEmpty).isTrue()
        assertThat(Capabilities.fromAnnotations(emptyList<Annotation>()).isEmpty).isTrue()
        assertThat(Capabilities(Persistence.ON_DISK).isEmpty)
            .isFalse()
        assertThat(Capabilities(listOf(Persistence.ON_DISK)).isEmpty)
            .isFalse()
    }

    @Test
    fun capabilities_unique() {
        assertFailsWith<IllegalArgumentException> {
            Capabilities(listOf(Ttl.Days(1).toRange(), Ttl.Hours(3)))
        }
    }

    @Test
    fun capabilities_fromAnnotations_persistent() {
        val persistent =
            Capabilities.fromAnnotation(Annotation.createCapability("persistent"))
        assertThat(persistent.persistence).isEqualTo(Persistence.ON_DISK)
        assertThat(persistent.isEncrypted).isNull()
        assertThat(persistent.ttl).isNull()
        assertThat(persistent.isQueryable).isNull()
        assertThat(persistent.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_ttl() {
        val ttl30d = Capabilities.fromAnnotation(Annotation.createTtl("30d"))
        assertThat(ttl30d.persistence).isNull()
        assertThat(ttl30d.isEncrypted).isNull()
        assertThat(ttl30d.ttl).isEqualTo(Capability.Ttl.Days(30))
        assertThat(ttl30d.isQueryable).isNull()
        assertThat(ttl30d.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_persistentAndTtl() {
        val persistentAndTtl30d = Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability("persistent"),
                Annotation.createTtl("30d")
            )
        )
        assertThat(persistentAndTtl30d.persistence).isEqualTo(Persistence.ON_DISK)
        assertThat(persistentAndTtl30d.isEncrypted).isNull()
        assertThat(persistentAndTtl30d.ttl).isEqualTo(Capability.Ttl.Days(30))
        assertThat(persistentAndTtl30d.isQueryable).isNull()
        assertThat(persistentAndTtl30d.isShareable).isNull()
    }

    @Test
    fun capabilities_fromAnnotations_queryableAndEncrypted() {
        val queryableEncrypted = Capabilities.fromAnnotations(
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
        val tiedToRuntime = Capabilities.fromAnnotation(
            Annotation.createCapability("tiedToRuntime")
        )
        assertThat(tiedToRuntime.persistence).isEqualTo(Persistence.IN_MEMORY)
        assertThat(tiedToRuntime.isEncrypted).isNull()
        assertThat(tiedToRuntime.ttl).isNull()
        assertThat(tiedToRuntime.isQueryable).isNull()
        assertThat(tiedToRuntime.isShareable).isTrue()
    }

    @Test
    fun capabilities_contains() {
        val capabilities = Capabilities(
            listOf<Capability.Range>(
                Persistence.ON_DISK.toRange(),
                Capability.Range(Capability.Ttl.Days(30), Capability.Ttl.Hours(1)),
                Capability.Queryable(true).toRange()
            )
        )
        assertThat(capabilities.contains(Persistence.ON_DISK)).isTrue()
        assertThat(capabilities.contains(Persistence.UNRESTRICTED)).isFalse()
        assertThat(capabilities.contains(Persistence.IN_MEMORY)).isFalse()
        assertThat(capabilities.contains(Capability.Ttl.Minutes(15))).isFalse()
        assertThat(capabilities.contains(Capability.Ttl.Hours(2))).isTrue()
        assertThat(capabilities.contains(Capability.Ttl.Days(30))).isTrue()
        assertThat(
            capabilities.contains(
                Capability.Range(Capability.Ttl.Days(20), Capability.Ttl.Hours(15))
            )
        ).isTrue()
        assertThat(capabilities.contains(Capability.Queryable(true))).isTrue()
        assertThat(capabilities.contains(Capability.Queryable(false))).isFalse()
        assertThat(capabilities.contains(Capability.Encryption(true))).isFalse()
        assertThat(capabilities.contains(Capability.Encryption(false))).isFalse()

        assertThat(capabilities.containsAll(capabilities)).isTrue()
        assertThat(
            capabilities.containsAll(
                Capabilities(
                    listOf<Capability.Range>(
                        Persistence.ON_DISK.toRange(),
                        Capability.Ttl.Days(10).toRange()
                    )
                )
            )
        ).isTrue()
        assertThat(
            capabilities.containsAll(
                Capabilities(
                    listOf<Capability.Range>(
                        Capability.Ttl.Days(10).toRange(),
                        Capability.Shareable(true).toRange()
                    )
                )
            )
        ).isFalse()
        assertThat(
            capabilities.containsAll(
                Capabilities(listOf<Capability.Range>(Capability.Queryable.ANY))
            )
        ).isFalse()
    }
    @Test
    fun capabilities_isEquivalent() {
        val capabilities = Capabilities(
            listOf(
                Capability.Range(Ttl.Days(10), Ttl.Days(2))
            )
        )
        assertThat(capabilities.contains(Ttl.Days(5))).isTrue()
        assertThat(capabilities.contains(Capability.Range(Ttl.Days(9), Ttl.Days(2)))).isTrue()
        assertThat(capabilities.containsAll(Capabilities(listOf(Ttl.Days(5))))).isTrue()
        assertThat(capabilities.containsAll(
            Capabilities(listOf(Capability.Range(Ttl.Days(9), Ttl.Days(2))))
        )).isTrue()
        assertThat(capabilities.isEquivalent(Capabilities(listOf(Ttl.Days(5))))).isFalse()
        assertThat(capabilities.isEquivalent(
            Capabilities(
                listOf(Capability.Range(Ttl.Days(9), Ttl.Days(2)))
            )
        )).isFalse()
        assertThat(capabilities.hasEquivalent(Capability.Range(Ttl.Days(10), Ttl.Days(2))))
            .isTrue()
        assertThat(capabilities.isEquivalent(
            Capabilities(listOf(Capability.Range(Ttl.Days(10), Ttl.Days(2))))
        )).isTrue()

    }
    @Test
    fun capabilities_isEquivalent_multipleRanges() {
        val capabilities = Capabilities(
            listOf(
                Persistence.ON_DISK,
                Capability.Range(Ttl.Days(10), Ttl.Days(2))
            )
        )
        assertThat(capabilities.contains(Ttl.Days(5))).isTrue()
        assertThat(capabilities.contains(Capability.Range(Ttl.Days(9), Ttl.Days(2)))).isTrue()
        assertThat(capabilities.containsAll(Capabilities(listOf(Ttl.Days(5))))).isTrue()
        assertThat(capabilities.containsAll(
            Capabilities(listOf(Capability.Range(Ttl.Days(9), Ttl.Days(2))))
        )).isTrue()
        assertThat(capabilities.isEquivalent(Capabilities(listOf(Ttl.Days(5))))).isFalse()
        assertThat(capabilities.isEquivalent(
            Capabilities(listOf(Capability.Range(Ttl.Days(9), Ttl.Days(2))))
        )).isFalse()
        assertThat(capabilities.isEquivalent(
            Capabilities(listOf(Capability.Range(Ttl.Days(10), Ttl.Days(2))))
        )).isFalse()
        assertThat(capabilities.hasEquivalent(Capability.Range(Ttl.Days(10), Ttl.Days(2))))
            .isTrue()
        assertThat(capabilities.hasEquivalent(Persistence.IN_MEMORY)).isFalse()
        assertThat(capabilities.hasEquivalent(Persistence.ON_DISK)).isTrue()
        assertThat(capabilities.containsAll(
            Capabilities(listOf(Persistence.ON_DISK, Ttl.Days(10)))
        )).isTrue()
        assertThat(capabilities.containsAll(
            Capabilities(listOf(Persistence.ON_DISK, Encryption(true)))
        )).isFalse()
        assertThat(capabilities.isEquivalent(
              Capabilities(listOf(Persistence.ON_DISK, Ttl.Days(10)))
        )).isFalse()
        assertThat(capabilities.isEquivalent(
            Capabilities(listOf(Persistence.ON_DISK, Capability.Range(Ttl.Days(10), Ttl.Days(2))))
        )).isTrue()
    }
}
