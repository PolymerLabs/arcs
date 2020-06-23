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

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

private typealias Persistence = CapabilityNew.Persistence
private typealias Encryption = CapabilityNew.Encryption
private typealias Queryable = CapabilityNew.Queryable
private typealias Shareable = CapabilityNew.Shareable
private typealias Range = CapabilityNew.Range

@RunWith(JUnit4::class)
class CapabilityNewTest {
    @Test
    fun capability_persistence_isEquivalent() {
        assertTrue(Persistence.UNRESTRICTED.isEquivalent(Persistence.UNRESTRICTED))
        assertTrue(Persistence.ON_DISK.isEquivalent(Persistence.ON_DISK))
        assertTrue(Persistence.IN_MEMORY.isEquivalent(Persistence.IN_MEMORY))
        assertTrue(Persistence.NONE.isEquivalent(Persistence.NONE))

        assertFalse(Persistence.UNRESTRICTED.isEquivalent(Persistence.ON_DISK))
        assertFalse(Persistence.ON_DISK.isEquivalent(Persistence.IN_MEMORY))
        assertFalse(Persistence.IN_MEMORY.isEquivalent(Persistence.NONE))
        assertFalse(Persistence.NONE.isEquivalent(Persistence.UNRESTRICTED))
    }

    @Test
    fun capability_persistence_compare() {
        assertFalse(Persistence.UNRESTRICTED.isLessStrict(Persistence.UNRESTRICTED))
        assertTrue(Persistence.UNRESTRICTED.isSameOrLessStrict(Persistence.IN_MEMORY))
        assertTrue(Persistence.UNRESTRICTED.isLessStrict(Persistence.IN_MEMORY))

        assertTrue(Persistence.IN_MEMORY.isStricter(Persistence.ON_DISK))
        assertFalse(Persistence.IN_MEMORY.isLessStrict(Persistence.ON_DISK))
        assertFalse(Persistence.IN_MEMORY.isSameOrLessStrict(Persistence.ON_DISK))
        assertTrue(Persistence.ON_DISK.isLessStrict(Persistence.IN_MEMORY))
        assertTrue(Persistence.ON_DISK.isSameOrLessStrict(Persistence.IN_MEMORY))
    }

    @Test
    fun capability_ttl_compare() {
        val ttl3Days = CapabilityNew.Ttl.Days(3)
        val ttl10Hours = CapabilityNew.Ttl.Hours(10)

        assertTrue(ttl3Days.isEquivalent(ttl3Days))
        assertFalse(ttl3Days.isEquivalent(ttl10Hours))
        assertTrue(ttl3Days.isLessStrict(ttl10Hours))
        assertTrue(ttl3Days.isSameOrLessStrict(ttl10Hours))
        assertFalse(ttl3Days.isStricter(ttl10Hours))
        assertFalse(ttl3Days.isSameOrStricter(ttl10Hours))
        assertFalse(ttl3Days.isEquivalent(ttl10Hours))
        assertTrue(ttl10Hours.isStricter(ttl3Days))
        assertTrue(ttl10Hours.isEquivalent(CapabilityNew.Ttl.Minutes(600)))
    
        val ttlInfinite = CapabilityNew.Ttl.Infinite()
        assertTrue(ttlInfinite.isEquivalent(ttlInfinite))
        assertTrue(ttlInfinite.isSameOrLessStrict(ttlInfinite))
        assertTrue(ttlInfinite.isSameOrStricter(ttlInfinite))
        assertFalse(ttlInfinite.isStricter(ttlInfinite))
        assertFalse(ttlInfinite.isLessStrict(ttlInfinite))
    
        assertTrue(ttl3Days.isStricter(ttlInfinite))
        assertFalse(ttlInfinite.isStricter(ttl3Days))
        assertTrue(ttlInfinite.isLessStrict(ttl3Days))
        assertFalse(ttl3Days.isLessStrict(ttlInfinite))
        assertFalse(ttlInfinite.isEquivalent(ttl3Days))
    }

    @Test
    fun capability_queryable_compare() {
        val queryable = Queryable(true)
        val nonQueryable = Queryable(false)
        assertTrue(queryable.isEquivalent(queryable))
        assertTrue(nonQueryable.isEquivalent(nonQueryable))
        assertFalse(nonQueryable.isEquivalent(queryable))
        assertFalse(queryable.isStricter(queryable))
        assertTrue(queryable.isSameOrStricter(queryable))
        assertTrue(queryable.isSameOrStricter(nonQueryable))
        assertTrue(nonQueryable.isLessStrict(queryable))
    }

    @Test
    fun capability_shareable_compare() {
        val shareable = Shareable(true)
        val nonShareable = Shareable(false)
        assertTrue(shareable.isEquivalent(shareable))
        assertTrue(nonShareable.isEquivalent(nonShareable))
        assertFalse(nonShareable.isEquivalent(shareable))
        assertFalse(shareable.isStricter(shareable))
        assertTrue(shareable.isSameOrStricter(shareable))
        assertTrue(shareable.isSameOrStricter(nonShareable))
        assertTrue(nonShareable.isLessStrict(shareable))
    }

    @Test
    fun capability_encryption_compare() {
        val encrypted = Encryption(true)
        val nonEncrypted = Encryption(false)
        assertTrue(encrypted.isEquivalent(encrypted))
        assertTrue(nonEncrypted.isEquivalent(nonEncrypted))
        assertFalse(nonEncrypted.isEquivalent(encrypted))
        assertFalse(encrypted.isStricter(encrypted))
        assertTrue(encrypted.isSameOrStricter(encrypted))
        assertTrue(encrypted.isSameOrStricter(nonEncrypted))
        assertTrue(nonEncrypted.isLessStrict(encrypted))
    }

    @Test
    fun capabilityrange_fail_init() {
        assertFailsWith<ClassCastException> {
            Range(Encryption(true), Shareable(true))
        }
        assertFailsWith<IllegalArgumentException> {
            Range(Encryption(true), Encryption(false))
        }
    }
    @Test
    fun capabilityrange_compareBooleanRanges() {
        assertTrue(Queryable.ANY.isEquivalent(Queryable.ANY))
        assertFalse(Queryable.ANY.isEquivalent(Queryable(true)))
        assertTrue(Queryable.ANY.contains(Queryable.ANY))
        assertTrue(Queryable.ANY.contains(Queryable(false)))
        assertTrue(Queryable.ANY.contains(Queryable(false).toRange()))
        assertTrue(Queryable.ANY.contains(Queryable(true)))
        assertTrue(Queryable.ANY.contains(Queryable(true).toRange()))
    }

    @Test
    fun capabilityrange_ttl_isEquivalent() {
        assertTrue(CapabilityNew.Ttl.ANY.isEquivalent(CapabilityNew.Ttl.ANY))
        assertFalse(CapabilityNew.Ttl.ANY.isEquivalent(CapabilityNew.Ttl.Infinite()))
        assertTrue(CapabilityNew.Ttl.Infinite().toRange().isEquivalent(CapabilityNew.Ttl.Infinite()))
    }

    @Test
    fun capabilityrange_ttl_contains() {
        assertTrue(Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3)).contains(
                      Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3))))
        assertTrue(Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3)).contains(
                      Range(CapabilityNew.Ttl.Hours(8), CapabilityNew.Ttl.Hours(6))))
        assertFalse(Range(CapabilityNew.Ttl.Hours(10), CapabilityNew.Ttl.Hours(3)).contains(
                       Range(CapabilityNew.Ttl.Hours(8), CapabilityNew.Ttl.Hours(2))))
        assertTrue(Range(CapabilityNew.Ttl.Infinite(), CapabilityNew.Ttl.Hours(3)).contains(
                      Range(CapabilityNew.Ttl.Hours(8), CapabilityNew.Ttl.Hours(3))))
        assertTrue(CapabilityNew.Ttl.ANY.contains(CapabilityNew.Ttl.Infinite()))
        assertTrue(CapabilityNew.Ttl.ANY.contains(Range(CapabilityNew.Ttl.Infinite(), CapabilityNew.Ttl.Hours(3))))
        assertTrue(CapabilityNew.Ttl.ANY.contains(Range(CapabilityNew.Ttl.Hours(3), CapabilityNew.Ttl.ZERO)))
    }

    @Test
    fun capabilityrange_persistence_isEquivalent() {
        assertTrue(Persistence.ANY.isEquivalent(Persistence.ANY))
        assertFalse(Persistence.ANY.isEquivalent(Persistence.UNRESTRICTED))
        assertTrue(Persistence.UNRESTRICTED.toRange().isEquivalent(Persistence.UNRESTRICTED))
        assertTrue(Persistence.ON_DISK.toRange().isEquivalent(Persistence.ON_DISK.toRange()))
    }

    @Test
    fun capabilityrange_persistence_contains() {
        assertTrue(Persistence.ON_DISK.toRange().contains(Persistence.ON_DISK.toRange()))
        assertTrue(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(
                      Persistence.ON_DISK))
        assertTrue(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(
                      Persistence.IN_MEMORY.toRange()))
        assertFalse(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(
                       Persistence.UNRESTRICTED))
        assertFalse(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(
                       Persistence.ANY))
        assertTrue(Persistence.ANY.contains(Persistence.ON_DISK))
        assertTrue(Persistence.ANY.contains(Persistence.ON_DISK.toRange()))
        assertTrue(Persistence.ANY.contains(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)))
    }
}
