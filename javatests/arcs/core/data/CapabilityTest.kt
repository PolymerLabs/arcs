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
import arcs.core.data.Capability.Ttl
import arcs.core.util.Time
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class CapabilityTest {
  @Test
  fun compare_capabilityPersistence() {
    assertThat(Persistence.UNRESTRICTED.isEquivalent(Persistence.UNRESTRICTED)).isTrue()
    assertThat(Persistence.UNRESTRICTED.isEquivalent(Persistence.ON_DISK)).isFalse()
    assertThat(Persistence.UNRESTRICTED.isLessStrict(Persistence.UNRESTRICTED)).isFalse()
    assertThat(Persistence.UNRESTRICTED.isSameOrLessStrict(Persistence.IN_MEMORY)).isTrue()
    assertThat(Persistence.UNRESTRICTED.isLessStrict(Persistence.IN_MEMORY)).isTrue()
    assertThat(Persistence.UNRESTRICTED.isLessStrict(Persistence.NONE)).isTrue()

    assertThat(Persistence.ON_DISK.isEquivalent(Persistence.ON_DISK)).isTrue()
    assertThat(Persistence.ON_DISK.isEquivalent(Persistence.IN_MEMORY)).isFalse()
    assertThat(Persistence.ON_DISK.isLessStrict(Persistence.IN_MEMORY)).isTrue()
    assertThat(Persistence.ON_DISK.isSameOrLessStrict(Persistence.IN_MEMORY)).isTrue()

    assertThat(Persistence.IN_MEMORY.isEquivalent(Persistence.IN_MEMORY)).isTrue()
    assertThat(Persistence.IN_MEMORY.isEquivalent(Persistence.NONE)).isFalse()
    assertThat(Persistence.IN_MEMORY.isStricter(Persistence.ON_DISK)).isTrue()
    assertThat(Persistence.IN_MEMORY.isLessStrict(Persistence.ON_DISK)).isFalse()
    assertThat(Persistence.IN_MEMORY.isSameOrLessStrict(Persistence.ON_DISK)).isFalse()

    assertThat(Persistence.NONE.isEquivalent(Persistence.NONE)).isTrue()
    assertThat(Persistence.NONE.isEquivalent(Persistence.UNRESTRICTED)).isFalse()
    assertThat(Persistence.NONE.isStricter(Persistence.UNRESTRICTED)).isTrue()
  }

  @Test
  fun compare_capabilityTtl() {
    val ttl3Days = Ttl.Days(3)
    val ttl10Hours = Ttl.Hours(10)
    assertThat(ttl3Days.isEquivalent(ttl3Days)).isTrue()
    assertThat(ttl3Days.isEquivalent(ttl10Hours)).isFalse()
    assertThat(ttl3Days.isLessStrict(ttl10Hours)).isTrue()
    assertThat(ttl3Days.isSameOrLessStrict(ttl10Hours)).isTrue()
    assertThat(ttl3Days.isStricter(ttl10Hours)).isFalse()
    assertThat(ttl3Days.isSameOrStricter(ttl10Hours)).isFalse()
    assertThat(ttl3Days.isEquivalent(ttl10Hours)).isFalse()
    assertThat(ttl10Hours.isStricter(ttl3Days)).isTrue()
    assertThat(ttl10Hours.isEquivalent(Ttl.Minutes(600))).isTrue()

    val ttl300Minutes = Ttl.Minutes(300)
    assertThat(ttl300Minutes.isEquivalent(Ttl.Minutes(300))).isTrue()
    assertThat(ttl300Minutes.isEquivalent(ttl3Days)).isFalse()
    assertThat(ttl300Minutes.isEquivalent(Ttl.Hours(5))).isTrue()
    assertThat(ttl300Minutes.isSameOrStricter(ttl10Hours)).isTrue()
    assertThat(ttl300Minutes.isStricter(ttl10Hours)).isTrue()
    assertThat(ttl3Days.isSameOrLessStrict(ttl300Minutes)).isTrue()
    assertThat(ttl3Days.isLessStrict(ttl300Minutes)).isTrue()

    val ttlInfinite = Ttl.Infinite()
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
    assertThat(ttlInfinite.isEquivalent(ttl300Minutes)).isFalse()
    assertThat(ttl300Minutes.isEquivalent(ttlInfinite)).isFalse()
    assertThat(ttlInfinite.isLessStrict(ttl300Minutes)).isTrue()
    assertThat(ttl300Minutes.isLessStrict(ttlInfinite)).isFalse()
  }

  @Test
  fun compare_capabilityEncryption() {
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
  fun compare_capabilityQueryable() {
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
  fun compare_capabilityShareable() {
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
  fun compare_capability_incompatible() {
    assertFailsWith<IllegalArgumentException> {
      Persistence.ON_DISK.compare(Ttl.Hours(1))
    }
    assertFailsWith<IllegalArgumentException> {
      Ttl.Hours(1).compare(Shareable(true))
    }
    assertFailsWith<IllegalArgumentException> {
      Shareable(true).compare(Queryable.ANY)
    }
    assertFailsWith<IllegalArgumentException> {
      Encryption(false).compare(Persistence.ANY)
    }
  }

  @Test
  fun compare_capabilityRange_unsupported() {
    assertFailsWith<UnsupportedOperationException> {
      Persistence.ON_DISK.toRange().compare(Persistence.ANY)
    }
    assertFailsWith<UnsupportedOperationException> {
      Ttl.ANY.toRange().compare(Range(Ttl.Hours(1), Ttl.Minutes(30)))
    }
    assertFailsWith<UnsupportedOperationException> {
      Queryable.ANY.compare(Queryable(true).toRange())
    }
    assertFailsWith<UnsupportedOperationException> {
      Encryption.ANY.compare(Encryption(true).toRange())
    }
    assertFailsWith<UnsupportedOperationException> {
      Shareable.ANY.compare(Shareable(true).toRange())
    }
  }

  @Test
  fun isEquivalent_rangesPersistence() {
    assertThat(Persistence.ANY.isEquivalent(Persistence.ANY)).isTrue()
    assertThat(Persistence.ANY.isEquivalent(Persistence.ON_DISK.toRange())).isFalse()
    assertThat(Persistence.ON_DISK.toRange().isEquivalent(Persistence.ANY)).isFalse()
    assertThat(Persistence.ON_DISK.toRange().isEquivalent(Persistence.ON_DISK.toRange())).isTrue()
    assertThat(Persistence.ON_DISK.toRange().isEquivalent(Persistence.IN_MEMORY.toRange()))
      .isFalse()
    assertThat(
      Range(Persistence.ON_DISK, Persistence.NONE).isEquivalent(
        Range(Persistence.IN_MEMORY, Persistence.NONE)
      )
    ).isFalse()
    assertThat(
      Range(Persistence.ON_DISK, Persistence.IN_MEMORY).isEquivalent(
        Range(Persistence.ON_DISK, Persistence.IN_MEMORY)
      )
    ).isTrue()
  }

  @Test
  fun isEquivalent_rangesTtl() {
    assertThat(Ttl.ANY.isEquivalent(Ttl.ANY)).isTrue()
    assertThat(Ttl.ANY.isEquivalent(Ttl.Hours(1).toRange())).isFalse()
    assertThat(Ttl.ANY.isEquivalent(Ttl.Infinite().toRange())).isFalse()
    assertThat(Ttl.Infinite().toRange().isEquivalent(Ttl.Infinite().toRange())).isTrue()
    assertThat(Ttl.Infinite().toRange().isEquivalent(Ttl.ANY)).isFalse()
    assertThat(Ttl.Hours(2).toRange().isEquivalent(Ttl.Minutes(120).toRange())).isTrue()
    assertThat(Range(Ttl.Hours(2), Ttl.Minutes(2)).isEquivalent(Ttl.Minutes(100).toRange()))
      .isFalse()
    assertThat(
      Range(Ttl.Hours(2), Ttl.Minutes(2)).isEquivalent(Range(Ttl.Minutes(100), Ttl.Hours(1)))
    ).isFalse()
    assertThat(Range(Ttl.Days(2), Ttl.Days(2)).isEquivalent(Ttl.Hours(48).toRange())).isTrue()
    assertThat(Range(Ttl.Days(2), Ttl.Hours(24)).isEquivalent(Range(Ttl.Hours(48), Ttl.Days(1))))
      .isTrue()
  }

  @Test
  fun isEquivalent_rangesEncryption() {
    assertThat(Encryption.ANY.isEquivalent(Encryption.ANY)).isTrue()
    assertThat(Encryption.ANY.isEquivalent(Encryption(true).toRange())).isFalse()
    assertThat(Encryption.ANY.isEquivalent(Encryption(false).toRange())).isFalse()
    assertThat(Encryption(false).toRange().isEquivalent(Encryption.ANY)).isFalse()
    assertThat(Encryption(true).toRange().isEquivalent(Encryption.ANY)).isFalse()
    assertThat(Encryption(false).toRange().isEquivalent(Encryption(true).toRange())).isFalse()
    assertThat(Encryption(true).toRange().isEquivalent(Encryption(false).toRange())).isFalse()
    assertThat(Encryption(false).toRange().isEquivalent(Encryption(false).toRange())).isTrue()
    assertThat(Encryption(true).toRange().isEquivalent(Encryption(true).toRange())).isTrue()
  }

  @Test
  fun isEquivalent_rangesQueryable() {
    assertThat(Queryable.ANY.isEquivalent(Queryable.ANY)).isTrue()
    assertThat(Queryable.ANY.isEquivalent(Queryable(true).toRange())).isFalse()
    assertThat(Queryable.ANY.isEquivalent(Queryable(false).toRange())).isFalse()
    assertThat(Queryable(false).toRange().isEquivalent(Queryable.ANY)).isFalse()
    assertThat(Queryable(true).toRange().isEquivalent(Queryable.ANY)).isFalse()
    assertThat(Queryable(false).toRange().isEquivalent(Queryable(true).toRange())).isFalse()
    assertThat(Queryable(true).toRange().isEquivalent(Queryable(false).toRange())).isFalse()
    assertThat(Queryable(false).toRange().isEquivalent(Queryable(false).toRange())).isTrue()
    assertThat(Queryable(true).toRange().isEquivalent(Queryable(true).toRange())).isTrue()
  }

  @Test
  fun isEquivalent_rangesShareable() {
    assertThat(Shareable.ANY.isEquivalent(Shareable.ANY)).isTrue()
    assertThat(Shareable.ANY.isEquivalent(Shareable(true).toRange())).isFalse()
    assertThat(Shareable.ANY.isEquivalent(Shareable(false).toRange())).isFalse()
    assertThat(Shareable(false).toRange().isEquivalent(Shareable.ANY)).isFalse()
    assertThat(Shareable(true).toRange().isEquivalent(Shareable.ANY)).isFalse()
    assertThat(Shareable(false).toRange().isEquivalent(Shareable(true).toRange())).isFalse()
    assertThat(Shareable(true).toRange().isEquivalent(Shareable(false).toRange())).isFalse()
    assertThat(Shareable(false).toRange().isEquivalent(Shareable(false).toRange())).isTrue()
    assertThat(Shareable(true).toRange().isEquivalent(Shareable(true).toRange())).isTrue()
  }

  @Test
  fun isEquivalent_rangeAndCapabilityPersistence() {
    assertThat(Persistence.ANY.isEquivalent(Persistence.ON_DISK)).isFalse()
    assertThat(Persistence.ANY.isEquivalent(Persistence.NONE)).isFalse()
    assertThat(Persistence.ANY.isEquivalent(Persistence.UNRESTRICTED)).isFalse()
    assertThat(Persistence.ON_DISK.toRange().isEquivalent(Persistence.ON_DISK)).isTrue()
    assertThat(Persistence.ON_DISK.toRange().isEquivalent(Persistence.IN_MEMORY)).isFalse()
    assertThat(Persistence.UNRESTRICTED.toRange().isEquivalent(Persistence.UNRESTRICTED)).isTrue()
    assertThat(Persistence.UNRESTRICTED.toRange().isEquivalent(Persistence.ON_DISK)).isFalse()
  }

  @Test
  fun isEquivalent_rangeAndCapabilityTtl() {
    assertThat(Ttl.ANY.isEquivalent(Ttl.Hours(1).toRange())).isFalse()
    assertThat(Range(Ttl.Days(2), Ttl.Days(2)).isEquivalent(Ttl.Hours(48))).isTrue()
    assertThat(Ttl.Hours(2).toRange().isEquivalent(Ttl.Minutes(120))).isTrue()
    assertThat(Range(Ttl.Hours(2), Ttl.Minutes(2)).isEquivalent(Ttl.Minutes(100))).isFalse()
    assertThat(Ttl.ANY.isEquivalent(Ttl.Infinite())).isFalse()
    assertThat(Ttl.Infinite().toRange().isEquivalent(Ttl.Infinite())).isTrue()
  }

  @Test
  fun isEquivalent_rangeAndCapabilityEncryption() {
    assertThat(Encryption.ANY.isEquivalent(Encryption(true))).isFalse()
    assertThat(Encryption.ANY.isEquivalent(Encryption(false))).isFalse()
    assertThat(Encryption(false).toRange().isEquivalent(Encryption(true))).isFalse()
    assertThat(Encryption(true).toRange().isEquivalent(Encryption(false))).isFalse()
    assertThat(Encryption(false).toRange().isEquivalent(Encryption(false))).isTrue()
    assertThat(Encryption(true).toRange().isEquivalent(Encryption(true))).isTrue()
  }

  @Test
  fun isEquivalent_rangeAndCapabilityQueryable() {
    assertThat(Queryable.ANY.isEquivalent(Queryable(true))).isFalse()
    assertThat(Queryable.ANY.isEquivalent(Queryable(false))).isFalse()
    assertThat(Queryable(false).toRange().isEquivalent(Queryable(true))).isFalse()
    assertThat(Queryable(true).toRange().isEquivalent(Queryable(false))).isFalse()
    assertThat(Queryable(false).toRange().isEquivalent(Queryable(false))).isTrue()
    assertThat(Queryable(true).toRange().isEquivalent(Queryable(true))).isTrue()
  }

  @Test
  fun isEquivalent_rangeAndCapabilityShareable() {
    assertThat(Shareable.ANY.isEquivalent(Shareable(true))).isFalse()
    assertThat(Shareable.ANY.isEquivalent(Shareable(false))).isFalse()
    assertThat(Shareable(false).toRange().isEquivalent(Shareable(true))).isFalse()
    assertThat(Shareable(true).toRange().isEquivalent(Shareable(false))).isFalse()
    assertThat(Shareable(false).toRange().isEquivalent(Shareable(false))).isTrue()
    assertThat(Shareable(true).toRange().isEquivalent(Shareable(true))).isTrue()
  }

  @Test
  fun isEquivalent_capabilityAndRangePersistence() {
    assertThat(Persistence.ON_DISK.isEquivalent(Persistence.ANY)).isFalse()
    assertThat(Persistence.ON_DISK.isEquivalent(Persistence.ON_DISK.toRange())).isTrue()
    assertThat(Persistence.ON_DISK.isEquivalent(Persistence.IN_MEMORY.toRange())).isFalse()
    assertThat(Persistence.ON_DISK.isEquivalent(Range(Persistence.IN_MEMORY, Persistence.NONE)))
      .isFalse()
  }

  @Test
  fun isEquivalent_capabilityAndRangeTtl() {
    assertThat(Ttl.Hours(1).isEquivalent(Ttl.ANY)).isFalse()
    assertThat(Ttl.Hours(2).isEquivalent(Ttl.Minutes(120).toRange())).isTrue()
    assertThat(Ttl.Hours(2).isEquivalent(Ttl.Minutes(100).toRange())).isFalse()
    assertThat(Ttl.Hours(2).isEquivalent(Range(Ttl.Minutes(100), Ttl.Hours(1)))).isFalse()
  }

  @Test
  fun isEquivalent_capabilityAndRangeEncryption() {
    assertThat(Encryption(false).isEquivalent(Encryption.ANY)).isFalse()
    assertThat(Encryption(true).isEquivalent(Encryption.ANY)).isFalse()
    assertThat(Encryption(false).isEquivalent(Encryption(false).toRange())).isTrue()
    assertThat(Encryption(false).isEquivalent(Encryption(true).toRange())).isFalse()
    assertThat(Encryption(true).isEquivalent(Encryption(false).toRange())).isFalse()
    assertThat(Encryption(true).isEquivalent(Encryption(true).toRange())).isTrue()
  }

  @Test
  fun isEquivalent_capabilityAndRangeQueryable() {
    assertThat(Queryable(false).isEquivalent(Queryable.ANY)).isFalse()
    assertThat(Queryable(true).isEquivalent(Queryable.ANY)).isFalse()
    assertThat(Queryable(false).isEquivalent(Queryable(false).toRange())).isTrue()
    assertThat(Queryable(false).isEquivalent(Queryable(true).toRange())).isFalse()
    assertThat(Queryable(true).isEquivalent(Queryable(false).toRange())).isFalse()
    assertThat(Queryable(true).isEquivalent(Queryable(true).toRange())).isTrue()
  }

  @Test
  fun isEquivalent_capabilityAndRangeShareable() {
    assertThat(Shareable(false).isEquivalent(Shareable.ANY)).isFalse()
    assertThat(Shareable(true).isEquivalent(Shareable.ANY)).isFalse()
    assertThat(Shareable(false).isEquivalent(Shareable(false).toRange())).isTrue()
    assertThat(Shareable(false).isEquivalent(Shareable(true).toRange())).isFalse()
    assertThat(Shareable(true).isEquivalent(Shareable(false).toRange())).isFalse()
    assertThat(Shareable(true).isEquivalent(Shareable(true).toRange())).isTrue()
  }

  @Test
  fun contains_capabilityPersistence() {
    assertThat(Persistence.ON_DISK.contains(Persistence.ON_DISK)).isTrue()
    assertThat(Persistence.IN_MEMORY.contains(Persistence.ON_DISK)).isFalse()
    assertThat(Persistence.IN_MEMORY.contains(Persistence.IN_MEMORY)).isTrue()
    assertThat(Persistence.ON_DISK.contains(Persistence.UNRESTRICTED)).isFalse()
    assertThat(Persistence.UNRESTRICTED.contains(Persistence.ON_DISK)).isFalse()
    assertThat(Persistence.UNRESTRICTED.contains(Persistence.NONE)).isFalse()
    assertThat(Persistence.UNRESTRICTED.contains(Persistence.UNRESTRICTED)).isTrue()
    assertThat(Persistence.NONE.contains(Persistence.IN_MEMORY)).isFalse()
    assertThat(Persistence.NONE.contains(Persistence.NONE)).isTrue()
  }

  @Test
  fun contains_rangePersistence() {
    assertThat(Persistence.ON_DISK.toRange().contains(Persistence.ON_DISK.toRange())).isTrue()
    assertThat(
      Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.ON_DISK.toRange())
    ).isTrue()
    assertThat(
      Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(
        Persistence.IN_MEMORY.toRange()
      )
    ).isTrue()
    assertThat(
      Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.UNRESTRICTED.toRange())
    ).isFalse()
    assertThat(
      Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.ANY)
    ).isFalse()
    assertThat(Persistence.ANY.contains(Persistence.ON_DISK.toRange())).isTrue()
    assertThat(Persistence.ANY.contains(Persistence.ON_DISK.toRange())).isTrue()
    assertThat(Persistence.ANY.contains(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)))
      .isTrue()
  }

  @Test
  fun contains_capabilityAndRangePersistence() {
    assertThat(Persistence.ON_DISK.contains(Persistence.ON_DISK.toRange())).isTrue()
    assertThat(Persistence.ON_DISK.contains(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)))
      .isFalse()
    assertThat(Persistence.IN_MEMORY.contains(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)))
      .isFalse()
    assertThat(Persistence.UNRESTRICTED.contains(Range(Persistence.ON_DISK, Persistence.IN_MEMORY)))
      .isFalse()
    assertThat(Persistence.UNRESTRICTED.contains(Persistence.UNRESTRICTED.toRange())).isTrue()
    assertThat(Persistence.NONE.contains(Persistence.NONE.toRange())).isTrue()
    assertThat(Persistence.ON_DISK.contains(Persistence.ANY)).isFalse()
    assertThat(Persistence.IN_MEMORY.contains(Persistence.ANY)).isFalse()
    assertThat(Persistence.NONE.contains(Persistence.ANY)).isFalse()
    assertThat(Persistence.UNRESTRICTED.contains(Persistence.ANY)).isFalse()
  }

  @Test
  fun contains_rangeAndCapabilityPersistence() {
    assertThat(Persistence.ON_DISK.toRange().contains(Persistence.ON_DISK)).isTrue()
    assertThat(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.ON_DISK))
      .isTrue()
    assertThat(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.IN_MEMORY))
      .isTrue()
    assertThat(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.UNRESTRICTED))
      .isFalse()
    assertThat(Range(Persistence.ON_DISK, Persistence.IN_MEMORY).contains(Persistence.NONE))
      .isFalse()
    assertThat(Persistence.ANY.contains(Persistence.UNRESTRICTED)).isTrue()
    assertThat(Persistence.ANY.contains(Persistence.ON_DISK)).isTrue()
    assertThat(Persistence.ANY.contains(Persistence.IN_MEMORY)).isTrue()
    assertThat(Persistence.ANY.contains(Persistence.NONE)).isTrue()
  }

  @Test
  fun contains_capabilityTtl() {
    assertThat(
      Range(Ttl.Hours(10), Ttl.Hours(3)).contains(Range(Ttl.Hours(10), Ttl.Hours(3)))
    ).isTrue()
    assertThat(
      Range(Ttl.Hours(10), Ttl.Hours(3)).contains(Range(Ttl.Hours(8), Ttl.Hours(6)))
    ).isTrue()
    assertThat(
      Range(Ttl.Hours(10), Ttl.Hours(3)).contains(Range(Ttl.Hours(8), Ttl.Hours(2)))
    ).isFalse()
    assertThat(
      Range(Ttl.Infinite(), Ttl.Hours(3)).contains(Range(Ttl.Hours(8), Ttl.Hours(3)))
    ).isTrue()
    assertThat(
      Range(Ttl.Hours(8), Ttl.Hours(3)).contains(Range(Ttl.Infinite(), Ttl.Hours(3)))
    ).isFalse()

    assertThat(
      Range(Ttl.Minutes(240), Ttl.Minutes(5)).contains(Range(Ttl.Hours(4), Ttl.Hours(3)))
    ).isTrue()
    assertThat(
      Range(Ttl.Minutes(100), Ttl.Minutes(50)).contains(Range(Ttl.Hours(8), Ttl.Hours(3)))
    ).isFalse()
    assertThat(
      Range(Ttl.Days(5), Ttl.Days(2)).contains(Range(Ttl.Days(4), Ttl.Days(2)))
    ).isTrue()
    assertThat(
      Range(Ttl.Minutes(3 * 24 * 60), Ttl.Minutes(24 * 60)).contains(
        Range(Ttl.Hours(40), Ttl.Hours(30))
      )
    ).isTrue()

    assertThat(Ttl.ANY.contains(Ttl.Infinite())).isTrue()
    assertThat(Ttl.ANY.contains(Range(Ttl.Infinite(), Ttl.Hours(3)))).isTrue()
    assertThat(Ttl.ANY.contains(Range(Ttl.Days(300), Ttl.Days(60)))).isTrue()
    assertThat(Ttl.ANY.contains(Range(Ttl.Hours(3), Ttl.Minutes(1)))).isTrue()
    assertThat(Ttl.ANY.contains(Range(Ttl.Minutes(30), Ttl.Minutes(10)))).isTrue()
    assertThat(Range(Ttl.Infinite(), Ttl.Hours(3)).contains(Ttl.ANY)).isFalse()
    assertThat(Range(Ttl.Days(300), Ttl.Days(60)).contains(Ttl.ANY)).isFalse()
    assertThat(Range(Ttl.Hours(3), Ttl.Minutes(1)).contains(Ttl.ANY)).isFalse()
    assertThat(Range(Ttl.Minutes(30), Ttl.Minutes(10)).contains(Ttl.ANY)).isFalse()
  }
  @Test
  fun contains_rangeTtl() {}
  @Test
  fun contains_capabilityAndRangeTtl() {}
  @Test
  fun contains_rangeAndCapabilityTtl() {}

  @Test
  fun contains_capabilityEncryption() {
    assertThat(Encryption(false).contains(Encryption(false))).isTrue()
    assertThat(Encryption(false).contains(Encryption(true))).isFalse()
    assertThat(Encryption(true).contains(Encryption(false))).isFalse()
    assertThat(Encryption(true).contains(Encryption(true))).isTrue()
  }

  @Test
  fun contains_rangeEncryption() {
    assertThat(Encryption.ANY.contains(Encryption.ANY)).isTrue()
    assertThat(Encryption.ANY.contains(Encryption(false).toRange())).isTrue()
    assertThat(Encryption.ANY.contains(Encryption(true).toRange())).isTrue()
    assertThat(Encryption(false).toRange().contains(Encryption(false).toRange())).isTrue()
    assertThat(Encryption(false).toRange().contains(Encryption(true).toRange())).isFalse()
    assertThat(Encryption(false).toRange().contains(Encryption.ANY)).isFalse()
    assertThat(Encryption(true).toRange().contains(Encryption.ANY)).isFalse()
    assertThat(Encryption(true).toRange().contains(Encryption(false).toRange())).isFalse()
    assertThat(Encryption(true).toRange().contains(Encryption(true).toRange())).isTrue()
  }

  @Test
  fun contains_capabilityAndRangeEncryption() {
    assertThat(Encryption(false).contains(Encryption.ANY)).isFalse()
    assertThat(Encryption(false).contains(Encryption(true).toRange())).isFalse()
    assertThat(Encryption(true).contains(Encryption.ANY)).isFalse()
    assertThat(Encryption(true).contains(Encryption(false).toRange())).isFalse()

    assertThat(Encryption(false).contains(Encryption(false).toRange())).isTrue()
    assertThat(Encryption(true).contains(Encryption(true).toRange())).isTrue()
  }

  @Test
  fun contains_rangeAndCapabilityEncryption() {
    assertThat(Encryption.ANY.contains(Encryption(false))).isTrue()
    assertThat(Encryption.ANY.contains(Encryption(true))).isTrue()
    assertThat(Encryption(false).toRange().contains(Encryption(false))).isTrue()
    assertThat(Encryption(false).toRange().contains(Encryption(true))).isFalse()
    assertThat(Encryption(true).toRange().contains(Encryption(false))).isFalse()
    assertThat(Encryption(true).toRange().contains(Encryption(true))).isTrue()
  }

  @Test
  fun contains_capabilityQueryable() {
    assertThat(Queryable(false).contains(Queryable(false))).isTrue()
    assertThat(Queryable(false).contains(Queryable(true))).isFalse()
    assertThat(Queryable(true).contains(Queryable(false))).isFalse()
    assertThat(Queryable(true).contains(Queryable(true))).isTrue()
  }

  @Test
  fun contains_rangeQueryable() {
    assertThat(Queryable.ANY.contains(Queryable.ANY)).isTrue()
    assertThat(Queryable.ANY.contains(Queryable(false).toRange())).isTrue()
    assertThat(Queryable.ANY.contains(Queryable(true).toRange())).isTrue()
    assertThat(Queryable(false).toRange().contains(Queryable(false).toRange())).isTrue()
    assertThat(Queryable(false).toRange().contains(Queryable(true).toRange())).isFalse()
    assertThat(Queryable(false).toRange().contains(Queryable.ANY)).isFalse()
    assertThat(Queryable(true).toRange().contains(Queryable.ANY)).isFalse()
    assertThat(Queryable(true).toRange().contains(Queryable(false).toRange())).isFalse()
    assertThat(Queryable(true).toRange().contains(Queryable(true).toRange())).isTrue()
  }

  @Test
  fun contains_capabilityAndRangeQueryable() {
    assertThat(Queryable(false).contains(Queryable.ANY)).isFalse()
    assertThat(Queryable(false).contains(Queryable(true).toRange())).isFalse()
    assertThat(Queryable(true).contains(Queryable.ANY)).isFalse()
    assertThat(Queryable(true).contains(Queryable(false).toRange())).isFalse()

    assertThat(Queryable(false).contains(Queryable(false).toRange())).isTrue()
    assertThat(Queryable(true).contains(Queryable(true).toRange())).isTrue()
  }

  @Test
  fun contains_rangeAndCapabilityQueryable() {
    assertThat(Queryable.ANY.contains(Queryable(false))).isTrue()
    assertThat(Queryable.ANY.contains(Queryable(true))).isTrue()
    assertThat(Queryable(false).toRange().contains(Queryable(false))).isTrue()
    assertThat(Queryable(false).toRange().contains(Queryable(true))).isFalse()
    assertThat(Queryable(true).toRange().contains(Queryable(false))).isFalse()
    assertThat(Queryable(true).toRange().contains(Queryable(true))).isTrue()
  }

  @Test
  fun contains_capabilityShareable() {
    assertThat(Shareable(false).contains(Shareable(false))).isTrue()
    assertThat(Shareable(false).contains(Shareable(true))).isFalse()
    assertThat(Shareable(true).contains(Shareable(false))).isFalse()
    assertThat(Shareable(true).contains(Shareable(true))).isTrue()
  }

  @Test
  fun contains_rangeShareable() {
    assertThat(Shareable.ANY.contains(Shareable.ANY)).isTrue()
    assertThat(Shareable.ANY.contains(Shareable(false).toRange())).isTrue()
    assertThat(Shareable.ANY.contains(Shareable(true).toRange())).isTrue()
    assertThat(Shareable(false).toRange().contains(Shareable(false).toRange())).isTrue()
    assertThat(Shareable(false).toRange().contains(Shareable(true).toRange())).isFalse()
    assertThat(Shareable(false).toRange().contains(Shareable.ANY)).isFalse()
    assertThat(Shareable(true).toRange().contains(Shareable.ANY)).isFalse()
    assertThat(Shareable(true).toRange().contains(Shareable(false).toRange())).isFalse()
    assertThat(Shareable(true).toRange().contains(Shareable(true).toRange())).isTrue()
  }

  @Test
  fun contains_capabilityAndRangeShareable() {
    assertThat(Shareable(false).contains(Shareable.ANY)).isFalse()
    assertThat(Shareable(false).contains(Shareable(true).toRange())).isFalse()
    assertThat(Shareable(true).contains(Shareable.ANY)).isFalse()
    assertThat(Shareable(true).contains(Shareable(false).toRange())).isFalse()

    assertThat(Shareable(false).contains(Shareable(false).toRange())).isTrue()
    assertThat(Shareable(true).contains(Shareable(true).toRange())).isTrue()
  }

  @Test
  fun contains_rangeAndCapabilityShareable() {
    assertThat(Shareable.ANY.contains(Shareable(false))).isTrue()
    assertThat(Shareable.ANY.contains(Shareable(true))).isTrue()
    assertThat(Shareable(false).toRange().contains(Shareable(false))).isTrue()
    assertThat(Shareable(false).toRange().contains(Shareable(true))).isFalse()
    assertThat(Shareable(true).toRange().contains(Shareable(false))).isFalse()
    assertThat(Shareable(true).toRange().contains(Shareable(true))).isTrue()
  }

  @Test
  fun init_capabilityRangeIncompatible_fail() {
    assertFailsWith<IllegalArgumentException> {
      Range(Persistence.ON_DISK, Encryption(false))
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Ttl.Days(1), Persistence.ON_DISK)
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Ttl.Days(10), Queryable(false))
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Encryption(false), Shareable(false))
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Queryable(false), Shareable(true))
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Encryption(true), Encryption(false))
    }
  }

  @Test
  fun init_capabilityRangeInvalid_fail() {
    assertFailsWith<IllegalArgumentException> {
      Range(Persistence.ON_DISK, Persistence.UNRESTRICTED)
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Ttl.Minutes(1), Ttl.Hours(1))
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Queryable(true), Queryable(false))
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Encryption(true), Encryption(false))
    }
    assertFailsWith<IllegalArgumentException> {
      Range(Shareable(true), Shareable(false))
    }
  }

  @Test
  fun isCompatible_capability() {
    // Persistence capabilities are compatible.
    assertThat(Persistence.ON_DISK.isCompatible(Persistence.ON_DISK)).isTrue()
    assertThat(Persistence.ON_DISK.isCompatible(Persistence.IN_MEMORY)).isTrue()
    assertThat(Persistence.UNRESTRICTED.isCompatible(Persistence.ON_DISK)).isTrue()

    // Ttl capabilities are compatible.
    assertThat(Ttl.Hours(3).isCompatible(Ttl.Infinite())).isTrue()
    assertThat(Ttl.Hours(3).isCompatible(Ttl.Minutes(33))).isTrue()

    // Encryption capabilities are compatible.
    assertThat(Encryption(true).isCompatible(Encryption(false))).isTrue()
    assertThat(Encryption(false).isCompatible(Encryption(true))).isTrue()

    // Queryable capabilities are compatible.
    assertThat(Queryable(true).isCompatible(Queryable(false))).isTrue()
    assertThat(Queryable(false).isCompatible(Queryable(true))).isTrue()

    // Shareable capabilities are compatible.
    assertThat(Shareable(true).isCompatible(Shareable(false))).isTrue()
    assertThat(Shareable(false).isCompatible(Shareable(true))).isTrue()

    // Incompatible capabilities.
    assertThat(Persistence.UNRESTRICTED.isCompatible(Ttl.Infinite())).isFalse()
    assertThat(Queryable(false).isCompatible(Encryption(false))).isFalse()
    assertThat(Shareable(false).isCompatible(Ttl.Infinite())).isFalse()
    assertThat(Shareable(false).isCompatible(Queryable(true))).isFalse()
  }

  @Test
  fun isCompatible_capabilityRanges_compatible() {
    assertThat(Persistence.ANY.isCompatible(Persistence.ANY)).isTrue()
    assertThat(Persistence.ANY.isCompatible(Range(Persistence.ON_DISK, Persistence.NONE))).isTrue()
    assertThat(Ttl.ANY.isCompatible(Range(Ttl.Days(2), Ttl.Hours(1)))).isTrue()
    assertThat(Encryption.ANY.isCompatible(Encryption.ANY)).isTrue()
    assertThat(Shareable.ANY.isCompatible(Shareable.ANY)).isTrue()
    assertThat(Queryable.ANY.isCompatible(Queryable.ANY)).isTrue()
  }

  @Test
  fun isCompatible_capabilityRanges_incompatible() {
    assertThat(Ttl.ANY.isCompatible(Range(Persistence.ON_DISK, Persistence.NONE))).isFalse()
    assertThat(Encryption.ANY.isCompatible(Range(Ttl.Days(2), Ttl.Hours(1)))).isFalse()
    assertThat(Shareable.ANY.isCompatible(Encryption.ANY)).isFalse()
    assertThat(Queryable.ANY.isCompatible(Shareable.ANY)).isFalse()
    assertThat(Persistence.ANY.isCompatible(Queryable.ANY)).isFalse()
  }

  @Test
  fun isCompatible_rangeWithCapability_compatible() {
    assertThat(Persistence.ANY.isCompatible(Persistence.ON_DISK)).isTrue()
    assertThat(Ttl.ANY.isCompatible(Ttl.Days(5))).isTrue()
    assertThat(Encryption.ANY.isCompatible(Encryption(false))).isTrue()
    assertThat(Shareable.ANY.isCompatible(Shareable(true))).isTrue()
    assertThat(Queryable.ANY.isCompatible(Queryable(true))).isTrue()
  }

  @Test
  fun isCompatible_capabilityWithRange_compatible() {
    assertThat(Persistence.ON_DISK.isCompatible(Persistence.ANY)).isTrue()
    assertThat(Ttl.Days(5).isCompatible(Ttl.ANY)).isTrue()
    assertThat(Encryption(false).isCompatible(Encryption.ANY)).isTrue()
    assertThat(Shareable(false).isCompatible(Shareable.ANY)).isTrue()
    assertThat(Queryable(true).isCompatible(Queryable.ANY)).isTrue()
  }

  @Test
  fun isCompatible_rangeWithCapability_incompatible() {
    assertThat(Queryable.ANY.isCompatible(Persistence.ON_DISK)).isFalse()
    assertThat(Persistence.ANY.isCompatible(Ttl.Days(5))).isFalse()
    assertThat(Ttl.ANY.isCompatible(Encryption(false))).isFalse()
    assertThat(Encryption.ANY.isCompatible(Shareable(true))).isFalse()
    assertThat(Shareable.ANY.isCompatible(Queryable(true))).isFalse()
  }

  @Test
  fun isCompatible_capabilityWithRange_incompatible() {
    assertThat(Queryable(true).isCompatible(Persistence.ANY)).isFalse()
    assertThat(Persistence.ON_DISK.isCompatible(Ttl.ANY)).isFalse()
    assertThat(Ttl.Days(5).isCompatible(Encryption.ANY)).isFalse()
    assertThat(Encryption(false).isCompatible(Shareable.ANY)).isFalse()
    assertThat(Shareable(false).isCompatible(Queryable.ANY)).isFalse()
  }

  // Tests for fromAnnotations methods.
  @Test
  fun fromAnnotations_persistence_errorMultiple() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Persistence.fromAnnotations(
          listOf(
            Annotation.createCapability("onDisk"),
            Annotation.createCapability("inMemory")
          )
        )
      }
    ).hasMessageThat().contains("Containing multiple persistence capabilities")
  }
  @Test
  fun fromAnnotations_persistence_errorParams() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Persistence.fromAnnotations(
          listOf(
            Annotation(
              name = "onDisk",
              params = mapOf("invalid" to AnnotationParam.Str("param"))
            )
          )
        )
      }
    ).hasMessageThat().contains("Unexpected parameter")
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Persistence.fromAnnotations(
          listOf(
            Annotation(
              name = "inMemory",
              params = mapOf("invalid" to AnnotationParam.Str("param"))
            )
          )
        )
      }
    ).hasMessageThat().contains("Unexpected parameter")
  }

  @Test
  fun fromAnnotations_persistence_empty() {
    assertThat(Persistence.fromAnnotations(emptyList<Annotation>())).isNull()
    assertThat(
      Persistence.fromAnnotations(listOf(Annotation("something"), Annotation("else")))
    ).isNull()
  }

  @Test
  fun fromAnnotations_persistence_ok() {
    assertThat(
      Persistence.fromAnnotations(listOf(Annotation("onDisk"), Annotation("other")))
    ).isEqualTo(Persistence.ON_DISK)
    // Two persistence annotations that represent the same Capability.
    assertThat(
      Persistence.fromAnnotations(listOf(Annotation("onDisk"), Annotation("persistent")))
    ).isEqualTo(Persistence.ON_DISK)
    assertThat(
      Persistence.fromAnnotations(listOf(Annotation("a"), Annotation("inMemory"), Annotation("b")))
    ).isEqualTo(Persistence.IN_MEMORY)
  }

  @Test
  fun fromAnnotations_ttl_errorMultiple() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Ttl.fromAnnotations(
          listOf(Annotation.createTtl("30d"), Annotation.createTtl("5 hours"))
        )
      }
    ).hasMessageThat().contains("Containing multiple ttl capabilities")
  }

  @Test
  fun fromAnnotations_ttl_errorNoParams() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Ttl.fromAnnotations(listOf(Annotation("ttl")))
      }
    ).hasMessageThat().contains("missing 'value' parameter")
  }

  @Test
  fun fromAnnotations_ttl_errorMultipleParams() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Ttl.fromAnnotations(
          listOf(
            Annotation(
              "ttl",
              mapOf("value" to AnnotationParam.Str("2h"), "x" to AnnotationParam.Str("y"))
            )
          )
        )
      }
    ).hasMessageThat().contains("Unexpected parameter for Ttl Capability annotation")
  }

  @Test
  fun fromAnnotations_ttl_invalid() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Ttl.fromAnnotations(listOf(Annotation.createTtl("foo")))
      }
    ).hasMessageThat().isEqualTo("Invalid TTL foo.")
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Ttl.fromAnnotations(listOf(Annotation.createTtl("200years")))
      }
    ).hasMessageThat().isEqualTo("Invalid TTL 200years.")
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Ttl.fromAnnotations(listOf(Annotation.createTtl("124")))
      }
    ).hasMessageThat().isEqualTo("Invalid TTL 124.")
  }

  @Test
  fun fromAnnotations_ttl_empty() {
    assertThat(Ttl.fromAnnotations(emptyList<Annotation>())).isNull()
    assertThat(
      Ttl.fromAnnotations(listOf(Annotation("something"), Annotation("else")))
    ).isNull()
  }

  @Test
  fun fromAnnotations_ttl_ok() {
    assertThat(
      Ttl.fromAnnotations(
        listOf(Annotation("something"), Annotation.createTtl("30d"), Annotation("else"))
      )
    ).isEqualTo(Ttl.Days(30))
  }

  @Test
  fun fromAnnotations_encryption_empty() {
    assertThat(Encryption.fromAnnotations(emptyList<Annotation>())).isNull()
    assertThat(Encryption.fromAnnotations(listOf(Annotation("something"), Annotation("else"))))
      .isNull()
  }

  @Test
  fun fromAnnotations_encryption_ok() {
    assertThat(
      Encryption.fromAnnotations(
        listOf(Annotation("something"), Annotation("encrypted"), Annotation("else"))
      )
    ).isEqualTo(Encryption(true))
  }

  @Test
  fun fromAnnotations_encryptionMultiple_invalid() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Encryption.fromAnnotations(
          listOf(Annotation("encrypted"), Annotation.createCapability("encrypted"))
        )
      }
    ).hasMessageThat().contains("Containing multiple encryption capabilities")
  }

  @Test
  fun fromAnnotations_encryption_unexpectedParam() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Encryption.fromAnnotations(
          listOf(Annotation("encrypted", mapOf("foo" to AnnotationParam.Str("bar"))))
        )
      }
    ).hasMessageThat().contains("Unexpected parameter for Encryption annotation")
  }

  @Test
  fun fromAnnotations_queryable_empty() {
    assertThat(Queryable.fromAnnotations(emptyList<Annotation>())).isNull()
    assertThat(Queryable.fromAnnotations(listOf(Annotation("something"), Annotation("else"))))
      .isNull()
  }

  @Test
  fun fromAnnotations_queryable_ok() {
    assertThat(
      Queryable.fromAnnotations(
        listOf(Annotation("something"), Annotation("queryable"), Annotation("else"))
      )
    ).isEqualTo(Queryable(true))
  }

  @Test
  fun fromAnnotations_queryableMultiple_invalid() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Queryable.fromAnnotations(
          listOf(Annotation("queryable"), Annotation.createCapability("queryable"))
        )
      }
    ).hasMessageThat().contains("Containing multiple queryable capabilities")
  }

  @Test
  fun fromAnnotations_queryable_unexpectedParam() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Queryable.fromAnnotations(
          listOf(Annotation("queryable", mapOf("foo" to AnnotationParam.Str("bar"))))
        )
      }
    ).hasMessageThat().contains("Unexpected parameter for Queryable annotation")
  }

  @Test
  fun fromAnnotations_shareable_empty() {
    assertThat(Shareable.fromAnnotations(emptyList<Annotation>())).isNull()
    assertThat(Shareable.fromAnnotations(listOf(Annotation("something"), Annotation("else"))))
      .isNull()
  }

  @Test
  fun fromAnnotations_shareable_ok() {
    assertThat(
      Shareable.fromAnnotations(
        listOf(Annotation("something"), Annotation("shareable"), Annotation("else"))
      )
    ).isEqualTo(Shareable(true))
  }

  @Test
  fun fromAnnotations_shareableMultiple_invalid() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Shareable.fromAnnotations(
          listOf(Annotation("shareable"), Annotation.createCapability("shareable"))
        )
      }
    ).hasMessageThat().contains("Containing multiple shareable capabilities")
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Shareable.fromAnnotations(
          listOf(Annotation("shareable"), Annotation.createCapability("shareable"))
        )
      }
    ).hasMessageThat().contains("Containing multiple shareable capabilities")
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Shareable.fromAnnotations(
          listOf(Annotation("tiedToRuntime"), Annotation.createCapability("shareable"))
        )
      }
    ).hasMessageThat().contains("Containing multiple shareable capabilities")
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Shareable.fromAnnotations(
          listOf(Annotation("tiedToRuntime"), Annotation.createCapability("tiedToRuntime"))
        )
      }
    ).hasMessageThat().contains("Containing multiple shareable capabilities")
  }

  @Test
  fun fromAnnotations_shareable_unexpectedParam() {
    assertThat(
      assertFailsWith<IllegalArgumentException> {
        Shareable.fromAnnotations(
          listOf(Annotation("shareable", mapOf("foo" to AnnotationParam.Str("bar"))))
        )
      }
    ).hasMessageThat().contains("Unexpected parameter for Shareable annotation")
  }

  // Ttl tests
  @Test
  fun fromString_ttl_invalid() {
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("invalid") }
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("123") }
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("day") }
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("    ") }
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("-10 hours") }
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("infinite") }
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("-1") }
    assertFailsWith<IllegalArgumentException> { Ttl.fromString("0") }
    assertFailsWith<NumberFormatException> { Ttl.fromString("9999999999days") }
  }

  @Test
  fun fromString_ttlDays_ok() {
    assertThat(Ttl.fromString("12d")).isEqualTo(Ttl.Days(12))
    assertThat(Ttl.fromString("  12d  ")).isEqualTo(Ttl.Days(12))
    assertThat(Ttl.fromString("12 d")).isEqualTo(Ttl.Days(12))
    assertThat(Ttl.fromString("12day")).isEqualTo(Ttl.Days(12))
    assertThat(Ttl.fromString("12 day")).isEqualTo(Ttl.Days(12))
    assertThat(Ttl.fromString("12days")).isEqualTo(Ttl.Days(12))
    assertThat(Ttl.fromString("12 days")).isEqualTo(Ttl.Days(12))
  }

  @Test
  fun fromString_ttlHours_ok() {
    assertThat(Ttl.fromString("8h")).isEqualTo(Ttl.Hours(8))
    assertThat(Ttl.fromString("  8h  ")).isEqualTo(Ttl.Hours(8))
    assertThat(Ttl.fromString("8 h")).isEqualTo(Ttl.Hours(8))
    assertThat(Ttl.fromString("8hour")).isEqualTo(Ttl.Hours(8))
    assertThat(Ttl.fromString("8 hour")).isEqualTo(Ttl.Hours(8))
    assertThat(Ttl.fromString("8hours")).isEqualTo(Ttl.Hours(8))
    assertThat(Ttl.fromString("8 hours")).isEqualTo(Ttl.Hours(8))
  }

  @Test
  fun fromString_ttlMinutes_ok() {
    assertThat(Ttl.fromString("45m")).isEqualTo(Ttl.Minutes(45))
    assertThat(Ttl.fromString("  45m  ")).isEqualTo(Ttl.Minutes(45))
    assertThat(Ttl.fromString("45 m")).isEqualTo(Ttl.Minutes(45))
    assertThat(Ttl.fromString("45minute")).isEqualTo(Ttl.Minutes(45))
    assertThat(Ttl.fromString("45 minute")).isEqualTo(Ttl.Minutes(45))
    assertThat(Ttl.fromString("45minutes")).isEqualTo(Ttl.Minutes(45))
    assertThat(Ttl.fromString("45 minutes")).isEqualTo(Ttl.Minutes(45))
  }

  @Test
  fun init_ttl_fail() {
    assertFailsWith<IllegalArgumentException> { Ttl.Days(0) }
    assertFailsWith<IllegalArgumentException> { Ttl.Days(-1) }
    assertFailsWith<IllegalArgumentException> { Ttl.Days(-5) }
    assertFailsWith<IllegalArgumentException> { Ttl.Hours(0) }
    assertFailsWith<IllegalArgumentException> { Ttl.Hours(-1) }
    assertFailsWith<IllegalArgumentException> { Ttl.Hours(-5) }
    assertFailsWith<IllegalArgumentException> { Ttl.Minutes(0) }
    assertFailsWith<IllegalArgumentException> { Ttl.Minutes(-1) }
    assertFailsWith<IllegalArgumentException> { Ttl.Minutes(-5) }
  }

  @Test
  fun calculateExpiration_Ttl() {
    val time = TestTime(12345L)
    val ttl2Days = Ttl.Days(2)
    val ttl2DaysExpiration = ttl2Days.calculateExpiration(time)
    assertThat(ttl2DaysExpiration).isEqualTo(ttl2Days.millis + time.millis)
    assertThat(Ttl.Hours(48).calculateExpiration(time)).isEqualTo(ttl2DaysExpiration)
    assertThat(Ttl.Minutes(2880).calculateExpiration(time)).isEqualTo(ttl2DaysExpiration)
    assertThat(Ttl.Days(3).calculateExpiration(time)).isGreaterThan(ttl2DaysExpiration)
    assertThat(Ttl.Infinite().calculateExpiration(time)).isEqualTo(-1)
  }

  class TestTime(var millis: Long = 999_999) : Time() {
    override val nanoTime: Long
      get() = millis * 1000000
    override val currentTimeMillis: Long
      get() = millis
  }
}
