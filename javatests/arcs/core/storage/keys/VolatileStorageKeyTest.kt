package arcs.core.storage.keys

import arcs.core.common.ArcId
import arcs.core.storage.StorageKeyParser
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileStorageKey]. */
@RunWith(JUnit4::class)
class VolatileStorageKeyTest {
    @Test
    fun toString_rendersCorrectly() {
        val arcId = ArcId.newForTest("arc")
        val key = VolatileStorageKey(arcId, "foo")
        assertThat(key.toString()).isEqualTo("$VOLATILE_DRIVER_PROTOCOL://$arcId/foo")
    }

    @Test
    fun childKeyWithComponent_isCorrect() {
        val arcId = ArcId.newForTest("arc")
        val parent = VolatileStorageKey(arcId, "parent")
        val child = parent.childKeyWithComponent("child")
        assertThat(child.toString()).isEqualTo("$VOLATILE_DRIVER_PROTOCOL://$arcId/parent/child")
    }

    @Test
    fun registersSelf_withStorageKeyParser() {
        val arcId = ArcId.newForTest("arc")
        val key = VolatileStorageKey(arcId, "foo")
        assertThat(StorageKeyParser.parse(key.toString())).isEqualTo(key)
    }
}
