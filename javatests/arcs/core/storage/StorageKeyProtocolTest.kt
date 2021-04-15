package arcs.core.storage

import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import com.google.common.truth.Truth.assertThat
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

    val protocolSet = StorageKeyProtocol.values().mapTo(mutableSetOf()) { it.protocolStr }
    assertThat(protocolSet.size).isEqualTo(StorageKeyProtocol.values().size)
  }

  @Test
  fun protocol_flagOn_protocolsAreUnique() {
    BuildFlags.STORAGE_KEY_REDUCTION = true

    val protocolSet = StorageKeyProtocol.values().mapTo(mutableSetOf()) { it.protocolStr }
    assertThat(protocolSet.size).isEqualTo(StorageKeyProtocol.values().size)
  }

  @Test
  fun protocol_flagOff_protocolsAreLong() {
    BuildFlags.STORAGE_KEY_REDUCTION = false

    assertThat(StorageKeyProtocol.Volatile.protocolStr).isEqualTo("volatile")
    assertThat(StorageKeyProtocol.RamDisk.protocolStr).isEqualTo("ramdisk")
  }

  @Test
  fun protocol_flagOn_protocolsAreShort() {
    BuildFlags.STORAGE_KEY_REDUCTION = true

    assertThat(StorageKeyProtocol.Volatile.protocolStr).isEqualTo("v")
    assertThat(StorageKeyProtocol.RamDisk.protocolStr).isEqualTo("r")
  }
}
