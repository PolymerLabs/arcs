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
package arcs.core.storage.keys

import arcs.core.storage.StorageKeyManager
import arcs.core.storage.embed
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [JoinStorageKey]. */
@RunWith(JUnit4::class)
class JoinStorageKeyTest {
  @Before
  fun setup() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(
      JoinStorageKey,
      RamDiskStorageKey
    )
  }

  @Test
  fun toString_rendersCorrectly() {
    val key1 = RamDiskStorageKey("key1")
    val key2 = RamDiskStorageKey("key2")
    val key = JoinStorageKey(listOf(key1, key2))

    assertThat(key.toString())
      .isEqualTo("join://2/{$key1}{$key2}")
  }

  @Test
  fun toString_rendersCorrectly_whenNested() {
    val key1 = RamDiskStorageKey("key1")
    val key2 = RamDiskStorageKey("key2")
    val key1Reference = JoinStorageKey(listOf(key1, key2))
    val key2Reference = JoinStorageKey(listOf(key2, key1))
    val parent = JoinStorageKey(listOf(key1Reference, key2Reference))

    val embeddedKey1 = key1Reference.embed()
    val embeddedKey2 = key2Reference.embed()

    assertThat(parent.toString())
      .isEqualTo("join://2/{$embeddedKey1}{$embeddedKey2}")
  }

  @Test
  fun parse_simpleJoinStorageKeys_isCorrect() {
    val key1 = RamDiskStorageKey("key1")
    val key2 = RamDiskStorageKey("key2")
    val key1Reference = JoinStorageKey(listOf(key1, key2))
    val key2Reference = JoinStorageKey(listOf(key2, key1))

    assertThat(
      StorageKeyManager.GLOBAL_INSTANCE.parse(key1Reference.toString())
    ).isEqualTo(key1Reference)
    val key1ReferenceKeyString = "2/{ramdisk://key1}{ramdisk://key2}"
    assertThat(key1Reference.toKeyString()).isEqualTo(key1ReferenceKeyString)
    assertThat(key1Reference.toString()).isEqualTo("join://$key1ReferenceKeyString")

    val key2ReferenceKeyString = "2/{ramdisk://key2}{ramdisk://key1}"
    assertThat(key2Reference.toKeyString()).isEqualTo(key2ReferenceKeyString)
    assertThat(key2Reference.toString()).isEqualTo("join://$key2ReferenceKeyString")
  }

  @Test
  fun parse_nestedJoinStorageKeys_isCorrect() {
    val key1 = RamDiskStorageKey("key1")
    val key2 = RamDiskStorageKey("key2")
    val key1Reference = JoinStorageKey(listOf(key1, key2))
    val key2Reference = JoinStorageKey(listOf(key2, key1))
    val parent = JoinStorageKey(listOf(key1Reference, key2Reference))

    assertThat(StorageKeyManager.GLOBAL_INSTANCE.parse(parent.toString())).isEqualTo(parent)
    val parentKeyString = "2/{join://2/{{ramdisk://key1}}{{ramdisk://key2}}}" +
      "{join://2/{{ramdisk://key2}}{{ramdisk://key1}}}"
    assertThat(parent.toKeyString()).isEqualTo(parentKeyString)
    assertThat(parent.toString()).isEqualTo("join://$parentKeyString")
  }

  @Test
  fun fromString_parse_correctly() {
    val parentKeyString = "2/{join://2/{{ramdisk://key1}}{{ramdisk://key2}}}" +
      "{join://2/{{ramdisk://key2}}{{ramdisk://key1}}}"
    val parentKey = JoinStorageKey.parse(parentKeyString)
    assertThat(parentKey.toKeyString()).isEqualTo(parentKeyString)
  }

  @Test
  fun fromString_parseWithExtraText_throws() {
    assertFailsWith<IllegalArgumentException>("extra text at start") {
      JoinStorageKey.parse("2/bogus{ramdisk://key1}{ramdisk://key2}")
    }
    assertFailsWith<IllegalArgumentException>("extra text at middle") {
      JoinStorageKey.parse("2/{ramdisk://key1}bogus{ramdisk://key2}")
    }
    assertFailsWith<IllegalArgumentException>("extra text at end") {
      JoinStorageKey.parse("2/{ramdisk://key1}{ramdisk://key2}bogus")
    }
  }

  @Test
  fun parse_invalidTooFewKeys_throws() {
    assertFailsWith<IllegalArgumentException>("got 3 keys, expect 4") {
      JoinStorageKey.parse("4/{ramdisk://key1}{ramdisk://key2}{ramdisk::/key3}")
    }
  }

  @Test
  fun parse_invalidTooManyKeys_throws() {
    assertFailsWith<IllegalArgumentException>("got 3 keys, expect 2") {
      JoinStorageKey.parse("2/{ramdisk://key1}{ramdisk://key2}{ramdisk::/key3}")
    }
  }

  @Test
  fun parse_malformedInnerKey_throws() {
    assertFailsWith<IllegalArgumentException>("ROM: is not valid protocol") {
      JoinStorageKey.parse("2/{ramdisk://key1}{ROM://key2}")
    }
  }

  @Test
  fun parse_invalidSeparator_throws() {
    assertFailsWith<IllegalArgumentException>("no / separator after count") {
      JoinStorageKey.parse("2:{ramdisk://key1}{ramdisk://key2}")
    }
  }

  @Test
  fun parse_invalidCount_throws() {
    assertFailsWith<IllegalArgumentException>("0 not a valid count") {
      JoinStorageKey.parse("0/")
    }
    assertFailsWith<IllegalArgumentException>("10 not a valid count") {
      JoinStorageKey.parse(
        "10/{ramdisk://k1}{ramdisk://k2}{ramdisk://k3}" +
          "{ramdisk://k4}{ramdisk://k5}{ramdisk://k6}{ramdisk://k7}" +
          "{ramdisk://k8}{ramdisk://k9}{ramdisk://kA}"
      )
    }
    // ':' is the next ASCII character after '9'
    assertFailsWith<IllegalArgumentException>(": is not a valid count") {
      JoinStorageKey.parse(
        ":/{ramdisk://k1}{ramdisk://k2}{ramdisk://k3}" +
          "{ramdisk://k4}{ramdisk://k5}{ramdisk://k6}{ramdisk://k7}" +
          "{ramdisk://k8}{ramdisk://k9}{ramdisk://kA}"
      )
    }
    // 'ᒿ'  (U+14BF : CANADIAN SYLLABICS SAYISI M) is a Unicode homoglyph for '2'
    assertFailsWith<IllegalArgumentException>("non-ASCII is not a valid count") {
      JoinStorageKey.parse("ᒿ:/{ramdisk://key1}{ramdisk://key2}")
    }
  }
}
