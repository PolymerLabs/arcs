package arcs.core.storage.keys

import arcs.core.storage.StorageKeyParser
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDiskStorageKey]. */
@RunWith(JUnit4::class)
class RamDiskStorageKeyTest {
    @Test
    fun toString_rendersCorrectly() {
        val key = RamDiskStorageKey("foo")
        assertThat(key.toString()).isEqualTo("$RAMDISK_DRIVER_PROTOCOL://foo")
    }

    @Test
    fun childKey_hasCorrectFormat() {
        val parent = RamDiskStorageKey("parent")
        val child = parent.childKeyWithComponent("child")
        assertThat(child.toString()).isEqualTo("$RAMDISK_DRIVER_PROTOCOL://parent/child")
    }

    @Test
    fun registersSelf_withStorageKeyParser() {
        val key = RamDiskStorageKey("foo")
        assertThat(StorageKeyParser.parse(key.toString())).isEqualTo(key)
    }
}
