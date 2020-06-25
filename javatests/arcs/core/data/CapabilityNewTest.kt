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

import arcs.core.data.CapabilityNew.Persistence
import arcs.core.data.CapabilityNew.Encryption
import arcs.core.data.CapabilityNew.Queryable
import arcs.core.data.CapabilityNew.Shareable
import arcs.core.data.CapabilityNew.Range
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith


@RunWith(JUnit4::class)
class CapabilityNewTest {
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
        val ttl3Days = CapabilityNew.Ttl.Days(3)
        val ttl10Hours = CapabilityNew.Ttl.Hours(10)

        assertThat(ttl3Days.isEquivalent(ttl3Days)).isTrue()
        assertThat(ttl3Days.isEquivalent(ttl10Hours)).isFalse()
        assertThat(ttl3Days.isLessStrict(ttl10Hours)).isTrue()
        assertThat(ttl3Days.isSameOrLessStrict(ttl10Hours)).isTrue()
        assertThat(ttl3Days.isStricter(ttl10Hours)).isFalse()
        assertThat(ttl3Days.isSameOrStricter(ttl10Hours)).isFalse()
        assertThat(ttl3Days.isEquivalent(ttl10Hours)).isFalse()
        assertThat(ttl10Hours.isStricter(ttl3Days)).isTrue()
        assertThat(ttl10Hours.isEquivalent(CapabilityNew.Ttl.Minutes(600))).isTrue()
    
        val ttlInfinite = CapabilityNew.Ttl.Infinite()
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
        assertThat(CapabilityNew.Ttl.ANY.isEquivalent(CapabilityNew.Ttl.ANY)).isTrue()
        assertThat(CapabilityNew.Ttl.ANY.isEquivalent(CapabilityNew.Ttl.Infinite())).isFalse()
        assertThat(CapabilityNew.Ttl.Infinite().toRange().isEquivalent(CapabilityNew.Ttl.Infinite())).isTrue()
    }

    @Test
    fun capabilityRange_ttl_contains() {
        assertThat(Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3)).contains(
                      Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3)))).isTrue()
        assertThat(Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3)).contains(
                      Range(CapabilityNew.Ttl.Hours(8), CapabilityNew.Ttl.Hours(6)))).isTrue()
        assertThat(Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3)).contains(
                       Range(CapabilityNew.Ttl.Hours(8), CapabilityNew.Ttl.Hours(2)))).isFalse()
        assertThat(Range(CapabilityNew.Ttl.Infinite(), CapabilityNew.Ttl.Hours(3)).contains(
                      Range(CapabilityNew.Ttl.Hours(8), CapabilityNew.Ttl.Hours(3)))).isTrue()
        assertThat(CapabilityNew.Ttl.ANY.contains(CapabilityNew.Ttl.Infinite())).isTrue()
        assertThat(
            CapabilityNew.Ttl.ANY.contains(
                Range(CapabilityNew.Ttl.Infinite(), CapabilityNew.Ttl.Hours(3))
            )
        ).isTrue()
        assertThat(
            CapabilityNew.Ttl.ANY.contains(
                Range(CapabilityNew.Ttl.Hours(3), CapabilityNew.Ttl.ZERO)
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
        assertThat(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)
            .contains(Persistence.IN_MEMORY.toRange())).isTrue()
        assertThat(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)
            .contains(Persistence.UNRESTRICTED)).isFalse()
        assertThat(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)
            .contains(Persistence.ANY)).isFalse()
        assertThat(Persistence.ANY.contains(Persistence.ON_DISK)).isTrue()
        assertThat(Persistence.ANY.contains(Persistence.ON_DISK.toRange())).isTrue()
        assertThat(Persistence.ANY.contains(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)))
            .isTrue()
    }
}
