package arcs.core.storage

import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class StorageKeyProtocolTest {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  @Test
  fun protocol_flagOff_protocolsAreUnique() {
    BuildFlags.STORAGE_KEY_REDUCTION = false

    val protocolSet = StorageKeyProtocol.values().mapTo(mutableSetOf()) { it.id }
    assertThat(protocolSet.size).isEqualTo(StorageKeyProtocol.values().size)
  }

  @Test
  fun protocol_flagOn_protocolsAreUnique() {
    BuildFlags.STORAGE_KEY_REDUCTION = true

    val protocolSet = StorageKeyProtocol.values().mapTo(mutableSetOf()) { it.id }
    assertThat(protocolSet.size).isEqualTo(StorageKeyProtocol.values().size)
  }

  @Test
  fun protocol_flagOff_protocolsAreLong() {
    BuildFlags.STORAGE_KEY_REDUCTION = false

    assertThat(StorageKeyProtocol.Volatile.id).isEqualTo("volatile")
    assertThat(StorageKeyProtocol.Volatile.protocol).isEqualTo("volatile://")
    assertThat(StorageKeyProtocol.RamDisk.id).isEqualTo("ramdisk")
    assertThat(StorageKeyProtocol.RamDisk.protocol).isEqualTo("ramdisk://")
  }

  @Test
  fun protocol_flagOn_protocolsAreShort() {
    BuildFlags.STORAGE_KEY_REDUCTION = true

    assertThat(StorageKeyProtocol.Volatile.id).isEqualTo("v")
    assertThat(StorageKeyProtocol.Volatile.protocol).isEqualTo("v|")
    assertThat(StorageKeyProtocol.RamDisk.id).isEqualTo("r")
    assertThat(StorageKeyProtocol.RamDisk.protocol).isEqualTo("r|")
  }

  @Test
  fun parseProtocol_flagOff_shortProtocols_throws() {
    BuildFlags.STORAGE_KEY_REDUCTION = false

    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("v") }
    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("r") }
  }

  @Test
  fun parseProtocol_flagOn_parsesShortProtocols() {
    BuildFlags.STORAGE_KEY_REDUCTION = true

    assertThat(StorageKeyProtocol.parseProtocol("v")).isEqualTo(StorageKeyProtocol.Volatile)
    assertThat(StorageKeyProtocol.parseProtocol("r")).isEqualTo(StorageKeyProtocol.RamDisk)
  }

  @Test
  fun parseProtocol_flagOff_unknownProtocols_throws() {
    BuildFlags.STORAGE_KEY_REDUCTION = false

    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("x") }
    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("unknown") }
  }

  @Test
  fun parseProtocol_flagOn_unknownProtocols_throws() {
    BuildFlags.STORAGE_KEY_REDUCTION = true

    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("x") }
    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("unknown") }
  }

  @Test
  fun parseProtocol_flagOff_parsesLongProtocols() {
    BuildFlags.STORAGE_KEY_REDUCTION = false

    assertThat(StorageKeyProtocol.parseProtocol("volatile")).isEqualTo(StorageKeyProtocol.Volatile)
    assertThat(StorageKeyProtocol.parseProtocol("ramdisk")).isEqualTo(StorageKeyProtocol.RamDisk)
  }

  @Test
  fun parseProtocol_flagOn_parsesLongProtocols_throws() {
    BuildFlags.STORAGE_KEY_REDUCTION = true

    assertThat(StorageKeyProtocol.parseProtocol("volatile")).isEqualTo(StorageKeyProtocol.Volatile)
    assertThat(StorageKeyProtocol.parseProtocol("ramdisk")).isEqualTo(StorageKeyProtocol.RamDisk)
  }
}
