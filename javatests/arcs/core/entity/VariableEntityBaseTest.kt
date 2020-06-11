package arcs.core.entity

import arcs.core.crdt.VersionMap
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class VariableEntityBaseTest  : EntityTestBase<DummyVariableEntity>() {

    @Before
    override fun setUp() {
        SchemaRegistry.register(DummyVariableEntity.SCHEMA)
        entity = DummyVariableEntity()
    }

    @Test
    override fun serializeRoundTrip() {
        with (entity) {
            text = "abc"
            num = 12.0
            bool = true
            ref = createReference("foo")
            texts = setOf("aa", "bb")
            nums = setOf(1.0, 2.0)
            bools = setOf(true, false)
            refs = setOf(createReference("ref1"), createReference("ref2"))
        }

        val rawEntity = entity.serialize()
        val deserialized = DummyVariableEntity()
        deserialized.deserializeForTest(rawEntity)

        assertThat(deserialized).isEqualTo(entity)
        assertThat(deserialized.serialize()).isEqualTo(rawEntity)
    }

    override fun createReference(id: String) = Reference(
        DummyVariableEntity,
        arcs.core.storage.Reference(id, DummyStorageKey(id), VersionMap("id" to 1))
    )

}
