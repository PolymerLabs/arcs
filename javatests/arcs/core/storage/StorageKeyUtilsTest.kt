package arcs.core.storage

import arcs.core.common.ArcId
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class StorageKeyUtilsTest {
  @Test
  fun extractKeysFromString_missingOpeningCurlyBrace_fail() {
    var e = assertFailsWith<IllegalArgumentException> {
      StorageKeyUtils.extractKeysFromString("foo bar")
    }
    assertThat(e).hasMessageThat().contains("missing opening curly brace")

    e = assertFailsWith<IllegalArgumentException> { StorageKeyUtils.extractKeysFromString("bar}") }
    assertThat(e).hasMessageThat().contains("missing opening curly brace")

    e = assertFailsWith<IllegalArgumentException> { StorageKeyUtils.extractKeysFromString("}bar}") }
    assertThat(e).hasMessageThat().contains("missing opening curly brace")

    StorageKeyParser.reset(RamDiskStorageKey)
    val key1 = RamDiskStorageKey("key1")
    e = assertFailsWith<IllegalArgumentException> {
      StorageKeyUtils.extractKeysFromString("{${key1.embed()}}aaa")
    }
    assertThat(e).hasMessageThat().contains("missing opening curly brace")
    e = assertFailsWith<IllegalArgumentException> {
      StorageKeyUtils.extractKeysFromString("{${key1.embed()}}}")
    }
    assertThat(e).hasMessageThat().contains("missing opening curly brace")
  }

  @Test
  fun extractKeysFromString_missingClosingCurlyBrace_fail() {
    val e = assertFailsWith<IllegalArgumentException> {
      StorageKeyUtils.extractKeysFromString("{foo")
    }
    assertThat(e).hasMessageThat().contains("missing closing curly brace")
  }

  @Test
  fun extractKeysFromString_invalidKeyPattern_fail() {
    val e = assertFailsWith<IllegalArgumentException> {
      StorageKeyUtils.extractKeysFromString("{baz}")
    }
    assertThat(e).hasMessageThat().contains("Invalid key pattern")
  }

  @Test
  fun extractKeysFromString_emptyString_emptyList() {
    assertThat(StorageKeyUtils.extractKeysFromString("")).isEmpty()
  }

  @Test
  fun extractKeysFromString_singleKey_success() {
    StorageKeyParser.reset(VolatileStorageKey)
    val key1 = VolatileStorageKey(ArcId.newForTest("foo"), "key1")
    val rawString = "{${key1.embed()}}"

    assertThat(StorageKeyUtils.extractKeysFromString(rawString)).containsExactly(key1)
  }

  @Test
  fun extractKeysFromString_ramdisk_success() {
    StorageKeyParser.reset(RamDiskStorageKey)
    val key1 = RamDiskStorageKey("key1")
    val key2 = RamDiskStorageKey("key2")
    val rawString = "{${key1.embed()}}{${key2.embed()}}"

    assertThat(StorageKeyUtils.extractKeysFromString(rawString)).containsExactly(key1, key2)
  }

  @Test
  fun extractKeysFromString_reference_success() {
    StorageKeyParser.reset(VolatileStorageKey, RamDiskStorageKey, ReferenceModeStorageKey)
    val arcId = ArcId.newForTest("foo")
    val key1 = ReferenceModeStorageKey(
      VolatileStorageKey(arcId, "backing1"),
      VolatileStorageKey(arcId, "container1")
    )
    val key2 = ReferenceModeStorageKey(
      RamDiskStorageKey("backing2"),
      RamDiskStorageKey("container2")
    )
    val rawString = "{${key1.embed()}}{${key2.embed()}}"

    assertThat(StorageKeyUtils.extractKeysFromString(rawString)).containsExactly(key1, key2)
  }
}
