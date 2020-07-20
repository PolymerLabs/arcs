package arcs.core.storage

import arcs.core.common.ArcId
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [StorageKeyFactory]. */
@RunWith(JUnit4::class)
class StorageKeyFactoryTest {

    @Test
    fun backingStore_namedEntity() {
        val namedSchema = Schema(
            setOf(SchemaName("Foo")),
            SchemaFields(emptyMap(), emptyMap()),
            "SomeHash"
        )
        val arcId = ArcId.newForTest("myId")

        val storeOptionsEmptyName = StorageKeyFactory.BackingStorageKeyOptions(
            arcId, namedSchema
        )

        assertThat(storeOptionsEmptyName.unique).isEqualTo("Foo")
    }

    @Test
    fun backingStore_namelessEntity() {
        val emptySchema = Schema(
            emptySet(),
            SchemaFields(emptyMap(), emptyMap()),
            "EmptyHash"
        )
        val emptyNamedSchema = Schema(
            setOf(SchemaName("")),
            SchemaFields(emptyMap(), emptyMap()),
            "SomeHash"
        )
        val arcId = ArcId.newForTest("myId")

        val storeOptionsEmpty = StorageKeyFactory.BackingStorageKeyOptions(
            arcId, emptySchema
        )

        val storeOptionsEmptyName = StorageKeyFactory.BackingStorageKeyOptions(
            arcId, emptyNamedSchema
        )

        assertThat(storeOptionsEmpty.unique).isEqualTo(emptySchema.hash)
        assertThat(storeOptionsEmptyName.unique).isEqualTo(emptyNamedSchema.hash)
    }
}
