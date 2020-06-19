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

/** Tests for [CapabilityNew]. */
@RunWith(JUnit4::class)
class CapabilityNewTest {
    @Test
    fun capability_persistence_isEquivalent() {
        assertTrue(CapabilityNew.Persistence.unrestricted().isEquivalent(
            CapabilityNew.Persistence.unrestricted()))
        assertTrue(CapabilityNew.Persistence.onDisk().isEquivalent(
            CapabilityNew.Persistence.onDisk()))
        assertTrue(CapabilityNew.Persistence.inMemory().isEquivalent(
            CapabilityNew.Persistence.inMemory()))
        assertTrue(CapabilityNew.Persistence.none().isEquivalent(
            CapabilityNew.Persistence.none()))

        assertFalse(CapabilityNew.Persistence.unrestricted().isEquivalent(
            CapabilityNew.Persistence.onDisk()))
        assertFalse(CapabilityNew.Persistence.onDisk().isEquivalent(
            CapabilityNew.Persistence.inMemory()))
        assertFalse(CapabilityNew.Persistence.inMemory().isEquivalent(
            CapabilityNew.Persistence.none()))
        assertFalse(CapabilityNew.Persistence.none().isEquivalent(
            CapabilityNew.Persistence.unrestricted()))
    }

    @Test
    fun capability_persistence_compare() {
        assertFalse(CapabilityNew.Persistence.unrestricted().isLessStrict(
            CapabilityNew.Persistence.unrestricted()))
        assertTrue(CapabilityNew.Persistence.unrestricted().isSameOrLessStrict(
            CapabilityNew.Persistence.inMemory()))
        assertTrue(CapabilityNew.Persistence.unrestricted().isLessStrict(
            CapabilityNew.Persistence.inMemory()))

        assertTrue(CapabilityNew.Persistence.inMemory().isStricter(
            CapabilityNew.Persistence.onDisk()))
        assertFalse(CapabilityNew.Persistence.inMemory().isLessStrict(
            CapabilityNew.Persistence.onDisk()))
        assertFalse(CapabilityNew.Persistence.inMemory().isSameOrLessStrict(
            CapabilityNew.Persistence.onDisk()))
        assertTrue(CapabilityNew.Persistence.onDisk().isLessStrict(
            CapabilityNew.Persistence.inMemory()))
        assertTrue(CapabilityNew.Persistence.onDisk().isSameOrLessStrict(
            CapabilityNew.Persistence.inMemory()))
    }

    @Test
    fun capability_ttl_compare() {
        val ttl3Days = CapabilityNew.TtlNew.Days(3)
        val ttl10Hours = CapabilityNew.TtlNew.Hours(10)

        assertTrue(ttl3Days.isEquivalent(ttl3Days))
        assertFalse(ttl3Days.isEquivalent(ttl10Hours))
        assertTrue(ttl3Days.isLessStrict(ttl10Hours))
        assertTrue(ttl3Days.isSameOrLessStrict(ttl10Hours))
        assertFalse(ttl3Days.isStricter(ttl10Hours))
        assertFalse(ttl3Days.isSameOrStricter(ttl10Hours))
        assertFalse(ttl3Days.isEquivalent(ttl10Hours))
        assertTrue(ttl10Hours.isStricter(ttl3Days))
        assertTrue(ttl10Hours.isEquivalent(CapabilityNew.TtlNew.Minutes(600)))
    
        val ttlInfinite = CapabilityNew.TtlNew.Infinite()
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
}
