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
import arcs.core.data.Capability.Queryable
import arcs.core.data.Capability.Range
import arcs.core.data.Capability.Shareable
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CapabilityTest {
    @Test
    fun capability_persistence_isEquivalent() {
        assertThat(Persistence.UNRESTRICTED.isEquivalent(Persistence.UNRESTRICTED)).isTrue()
        assertThat(Persistence.ON_DISK.isEquivalent(Persistence.ON_DISK)).isTrue()
        assertThat(Persistence.IN_MEMORY.isEquivalent(Persistence.IN_MEMORY)).isTrue()
        assertThat(Persistence.NONE.isEquivalent(Persistence.NONE)).isTrue()

        assertThat(Persistence.UNRESTRICTED.isEquivalent(Persistence.ON_DISK)).isFalse()
        assertThat(Persistence.ON_DISK.isEquivalent(Persistence.IN_MEMORY)).isFalse()
        assertThat(Persistence.IN_MEMORY.isEquivalent(Persistence.NONE)).isFalse()
        assertThat(Persistence.NONE.isEquivalent(Persistence.UNRESTRICTED)).isFalse()
    }

    @Test
    fun capability_persistence_compare() {
        assertThat(Persistence.UNRESTRICTED.isLessStrict(Persistence.UNRESTRICTED)).isFalse()
        assertThat(Persistence.UNRESTRICTED.isSameOrLessStrict(Persistence.IN_MEMORY)).isTrue()
        assertThat(Persistence.UNRESTRICTED.isLessStrict(Persistence.IN_MEMORY)).isTrue()

        assertThat(Persistence.IN_MEMORY.isStricter(Persistence.ON_DISK)).isTrue()
        assertThat(Persistence.IN_MEMORY.isLessStrict(Persistence.ON_DISK)).isFalse()
        assertThat(Persistence.IN_MEMORY.isSameOrLessStrict(Persistence.ON_DISK)).isFalse()
        assertThat(Persistence.ON_DISK.isLessStrict(Persistence.IN_MEMORY)).isTrue()
        assertThat(Persistence.ON_DISK.isSameOrLessStrict(Persistence.IN_MEMORY)).isTrue()
    }

    @Test
    fun capability_ttl_compare() {
        val ttl3Days = Capability.Ttl.Days(3)
        val ttl10Hours = Capability.Ttl.Hours(10)

        assertThat(ttl3Days.isEquivalent(ttl3Days)).isTrue()
        assertThat(ttl3Days.isEquivalent(ttl10Hours)).isFalse()
        assertThat(ttl3Days.isLessStrict(ttl10Hours)).isTrue()
        assertThat(ttl3Days.isSameOrLessStrict(ttl10Hours)).isTrue()
        assertThat(ttl3Days.isStricter(ttl10Hours)).isFalse()
        assertThat(ttl3Days.isSameOrStricter(ttl10Hours)).isFalse()
        assertThat(ttl3Days.isEquivalent(ttl10Hours)).isFalse()
        assertThat(ttl10Hours.isStricter(ttl3Days)).isTrue()
        assertThat(ttl10Hours.isEquivalent(Capability.Ttl.Minutes(600))).isTrue()

        val ttlInfinite = Capability.Ttl.Infinite()
        assertThat(ttlInfinite.isEquivalent(ttlInfinite)).isTrue()
        assertThat(ttlInfinite.isSameOrLessStrict(ttlInfinite)).isTrue()
        assertThat(ttlInfinite.isSameOrStricter(ttlInfinite)).isTrue()
        assertThat(ttlInfinite.isStricter(ttlInfinite)).isFalse()
        assertThat(ttlInfinite.isLessStrict(ttlInfinite)).isFalse()

        assertThat(ttl3Days.isStricter(ttlInfinite)).isTrue()
        assertThat(ttlInfinite.isStricter(ttl3Days)).isFalse()
        assertThat(ttlInfinite.isLessStrict(ttl3Days)).isTrue()
        assertThat(ttl3Days.isLessStrict(ttlInfinite)).isFalse()
        assertThat(ttlInfinite.isEquivalent(ttl3Days)).isFalse()
    }

    @Test
    fun capability_queryable_compare() {
        val queryable = Queryable(true)
        val nonQueryable = Queryable(false)
        assertThat(queryable.isEquivalent(queryable)).isTrue()
        assertThat(nonQueryable.isEquivalent(nonQueryable)).isTrue()
        assertThat(nonQueryable.isEquivalent(queryable)).isFalse()
        assertThat(queryable.isStricter(queryable)).isFalse()
        assertThat(queryable.isSameOrStricter(queryable)).isTrue()
        assertThat(queryable.isSameOrStricter(nonQueryable)).isTrue()
        assertThat(nonQueryable.isLessStrict(queryable)).isTrue()
    }

    @Test
    fun capability_shareable_compare() {
        val shareable = Shareable(true)
        val nonShareable = Shareable(false)
        assertThat(shareable.isEquivalent(shareable)).isTrue()
        assertThat(nonShareable.isEquivalent(nonShareable)).isTrue()
        assertThat(nonShareable.isEquivalent(shareable)).isFalse()
        assertThat(shareable.isStricter(shareable)).isFalse()
        assertThat(shareable.isSameOrStricter(shareable)).isTrue()
        assertThat(shareable.isSameOrStricter(nonShareable)).isTrue()
        assertThat(nonShareable.isLessStrict(shareable)).isTrue()
    }

    @Test
    fun capability_encryption_compare() {
        val encrypted = Encryption(true)
        val nonEncrypted = Encryption(false)
        assertThat(encrypted.isEquivalent(encrypted)).isTrue()
        assertThat(nonEncrypted.isEquivalent(nonEncrypted)).isTrue()
        assertThat(nonEncrypted.isEquivalent(encrypted)).isFalse()
        assertThat(encrypted.isStricter(encrypted)).isFalse()
        assertThat(encrypted.isSameOrStricter(encrypted)).isTrue()
        assertThat(encrypted.isSameOrStricter(nonEncrypted)).isTrue()
        assertThat(nonEncrypted.isLessStrict(encrypted)).isTrue()
    }

    @Test
    fun capabilityRange_fail_init() {
        assertFailsWith<ClassCastException> {
            Range(Encryption(true), Shareable(true))
        }
        assertFailsWith<IllegalArgumentException> {
            Range(Encryption(true), Encryption(false))
        }
    }

    @Test
    fun capabilityRange_compareBooleanRanges() {
        assertThat(Queryable.ANY.isEquivalent(Queryable.ANY)).isTrue()
        assertThat(Queryable.ANY.isEquivalent(Queryable(true))).isFalse()
        assertThat(Queryable.ANY.contains(Queryable.ANY)).isTrue()
        assertThat(Queryable.ANY.contains(Queryable(false))).isTrue()
        assertThat(Queryable.ANY.contains(Queryable(false).toRange())).isTrue()
        assertThat(Queryable.ANY.contains(Queryable(true))).isTrue()
        assertThat(Queryable.ANY.contains(Queryable(true).toRange())).isTrue()
    }

    @Test
    fun capabilityRange_ttl_isEquivalent() {
        assertThat(Capability.Ttl.ANY.isEquivalent(Capability.Ttl.ANY)).isTrue()
        assertThat(Capability.Ttl.ANY.isEquivalent(Capability.Ttl.Infinite())).isFalse()
        assertThat(Capability.Ttl.Infinite().toRange().isEquivalent(Capability.Ttl.Infinite())).isTrue()
    }

    @Test
    fun capabilityRange_ttl_contains() {
        assertThat(
            Range(Capability.Ttl.Hours(10), Capability.Ttl.Hours(3)).contains(
                Range(Capability.Ttl.Hours(10), Capability.Ttl.Hours(3))
            )
        ).isTrue()
        assertThat(
            Range(Capability.Ttl.Hours(10), Capability.Ttl.Hours(3)).contains(
                Range(Capability.Ttl.Hours(8), Capability.Ttl.Hours(6))
            )
        ).isTrue()
        assertThat(
            Range(Capability.Ttl.Hours(10), Capability.Ttl.Hours(3)).contains(
                Range(Capability.Ttl.Hours(8), Capability.Ttl.Hours(2))
            )
        ).isFalse()
        assertThat(
            Range(Capability.Ttl.Infinite(), Capability.Ttl.Hours(3)).contains(
                Range(Capability.Ttl.Hours(8), Capability.Ttl.Hours(3))
            )
        ).isTrue()
        assertThat(Capability.Ttl.ANY.contains(Capability.Ttl.Infinite())).isTrue()
        assertThat(
            Capability.Ttl.ANY.contains(
                Range(Capability.Ttl.Infinite(), Capability.Ttl.Hours(3))
            )
        ).isTrue()
        assertThat(
            Capability.Ttl.ANY.contains(
                Range(Capability.Ttl.Hours(3), Capability.Ttl.ZERO)
            )
        ).isTrue()
    }

    @Test
    fun capabilityRange_persistence_isEquivalent() {
        assertThat(Persistence.ANY.isEquivalent(Persistence.ANY)).isTrue()
        assertThat(Persistence.ANY.isEquivalent(Persistence.UNRESTRICTED)).isFalse()
        assertThat(Persistence.UNRESTRICTED.toRange().isEquivalent(Persistence.UNRESTRICTED)).isTrue()
        assertThat(Persistence.ON_DISK.toRange().isEquivalent(Persistence.ON_DISK.toRange())).isTrue()
    }

    @Test
    fun capabilityRange_persistence_contains() {
        assertThat(Persistence.ON_DISK.toRange().contains(Persistence.ON_DISK.toRange())).isTrue()
        assertThat(
            Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.ON_DISK)
        ).isTrue()
        assertThat(
            Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(
                Persistence.IN_MEMORY.toRange()
            )
        ).isTrue()
        assertThat(
            Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.UNRESTRICTED)
        ).isFalse()
        assertThat(
            Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.ANY)
        ).isFalse()
        assertThat(Persistence.ANY.contains(Persistence.ON_DISK)).isTrue()
        assertThat(Persistence.ANY.contains(Persistence.ON_DISK.toRange())).isTrue()
        assertThat(Persistence.ANY.contains(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)))
            .isTrue()
    }
}
