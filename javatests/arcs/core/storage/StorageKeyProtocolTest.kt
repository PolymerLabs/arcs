package arcs.core.storage

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
  fun protocol_protocolsAreUnique() {
    val protocolSet = StorageKeyProtocol.values().mapTo(mutableSetOf()) { it.id }
    assertThat(protocolSet.size).isEqualTo(StorageKeyProtocol.values().size)
  }

  @Test
  fun protocol_protocolsAreShort() {
    assertThat(StorageKeyProtocol.Volatile.id).isEqualTo("v")
    assertThat(StorageKeyProtocol.Volatile.protocol).isEqualTo("v|")
    assertThat(StorageKeyProtocol.RamDisk.id).isEqualTo("r")
    assertThat(StorageKeyProtocol.RamDisk.protocol).isEqualTo("r|")
  }

  @Test
  fun parseProtocol_parsesShortProtocols() {
    assertThat(StorageKeyProtocol.parseProtocol("v")).isEqualTo(StorageKeyProtocol.Volatile)
    assertThat(StorageKeyProtocol.parseProtocol("r")).isEqualTo(StorageKeyProtocol.RamDisk)
  }

  @Test
  fun parseProtocol_unknownProtocols_throws() {
    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("x") }
    assertFailsWith<IllegalArgumentException> { StorageKeyProtocol.parseProtocol("unknown") }
  }

  @Test
  fun parseProtocol_parsesLongProtocols() {
    assertThat(StorageKeyProtocol.parseProtocol("volatile")).isEqualTo(StorageKeyProtocol.Volatile)
    assertThat(StorageKeyProtocol.parseProtocol("ramdisk")).isEqualTo(StorageKeyProtocol.RamDisk)
  }
}
