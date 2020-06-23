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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CapabilityNewTest {
    @Test
    fun capability_persistence_isEquivalent() {
        assertTrue(CapabilityNew.Persistence.UNRESTRICTED.isEquivalent(
            CapabilityNew.Persistence.UNRESTRICTED))
        assertTrue(CapabilityNew.Persistence.ON_DISK.isEquivalent(
            CapabilityNew.Persistence.ON_DISK))
        assertTrue(CapabilityNew.Persistence.IN_MEMORY.isEquivalent(
            CapabilityNew.Persistence.IN_MEMORY))
        assertTrue(CapabilityNew.Persistence.NONE.isEquivalent(
            CapabilityNew.Persistence.NONE))

        assertFalse(CapabilityNew.Persistence.UNRESTRICTED.isEquivalent(
            CapabilityNew.Persistence.ON_DISK))
        assertFalse(CapabilityNew.Persistence.ON_DISK.isEquivalent(
            CapabilityNew.Persistence.IN_MEMORY))
        assertFalse(CapabilityNew.Persistence.IN_MEMORY.isEquivalent(
            CapabilityNew.Persistence.NONE))
        assertFalse(CapabilityNew.Persistence.NONE.isEquivalent(
            CapabilityNew.Persistence.UNRESTRICTED))
    }

    @Test
    fun capability_persistence_compare() {
        assertFalse(CapabilityNew.Persistence.UNRESTRICTED.isLessStrict(
            CapabilityNew.Persistence.UNRESTRICTED))
        assertTrue(CapabilityNew.Persistence.UNRESTRICTED.isSameOrLessStrict(
            CapabilityNew.Persistence.IN_MEMORY))
        assertTrue(CapabilityNew.Persistence.UNRESTRICTED.isLessStrict(
            CapabilityNew.Persistence.IN_MEMORY))

        assertTrue(CapabilityNew.Persistence.IN_MEMORY.isStricter(
            CapabilityNew.Persistence.ON_DISK))
        assertFalse(CapabilityNew.Persistence.IN_MEMORY.isLessStrict(
            CapabilityNew.Persistence.ON_DISK))
        assertFalse(CapabilityNew.Persistence.IN_MEMORY.isSameOrLessStrict(
            CapabilityNew.Persistence.ON_DISK))
        assertTrue(CapabilityNew.Persistence.ON_DISK.isLessStrict(
            CapabilityNew.Persistence.IN_MEMORY))
        assertTrue(CapabilityNew.Persistence.ON_DISK.isSameOrLessStrict(
            CapabilityNew.Persistence.IN_MEMORY))
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
        val queryable = CapabilityNew.Queryable(true)
        val nonQueryable = CapabilityNew.Queryable(false)
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
        val shareable = CapabilityNew.Shareable(true)
        val nonShareable = CapabilityNew.Shareable(false)
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
        val encrypted = CapabilityNew.Encryption(true)
        val nonEncrypted = CapabilityNew.Encryption(false)
        assertTrue(encrypted.isEquivalent(encrypted))
        assertTrue(nonEncrypted.isEquivalent(nonEncrypted))
        assertFalse(nonEncrypted.isEquivalent(encrypted))
        assertFalse(encrypted.isStricter(encrypted))
        assertTrue(encrypted.isSameOrStricter(encrypted))
        assertTrue(encrypted.isSameOrStricter(nonEncrypted))
        assertTrue(nonEncrypted.isLessStrict(encrypted))
    }
}
