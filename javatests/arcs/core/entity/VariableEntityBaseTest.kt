package arcs.core.entity

import arcs.core.crdt.VersionMap
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith


@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class VariableEntityBaseTest {

    private lateinit var entity: DummyVariableEntity
    private lateinit var biggerEntity: DummyEntity

    @Before
    fun setUp() {
        SchemaRegistry.register(DummyEntity.SCHEMA)
        SchemaRegistry.register(DummyVariableEntity.SCHEMA)
        entity = DummyVariableEntity()
        biggerEntity = DummyEntity()
            .apply {
                text = "abc"
                num = 12.0
                bool = true
                ref = createDummyReference("foo")
                texts = setOf("aa", "bb")
                nums = setOf(1.0, 2.0)
                bools = setOf(true, false)
                refs = setOf(createDummyReference("ref1"), createDummyReference("ref2"))
            }

    }

    @After
    fun tearDown() {
        SchemaRegistry.clearForTest()
    }

    @Test
    fun serializationRoundTrip() {
        val biggerRaw = biggerEntity.serialize()

        val variableEntity = DummyVariableEntity()
        variableEntity.deserializeForTest(biggerRaw)

        val backToBiggerRaw = variableEntity.serialize()
        assertThat(backToBiggerRaw).isEqualTo(biggerRaw)

        val backToBigger = DummyEntity()
        backToBigger.deserializeForTest(backToBiggerRaw)
        assertThat(backToBigger).isEqualTo(biggerEntity)
    }

    @Test
    fun onlyFieldsListedInSchemaAreAccessible() {
        val biggerRaw = biggerEntity.serialize()

        val variableEntity = DummyVariableEntity()
        variableEntity.deserializeForTest(biggerRaw)

        assertThat(variableEntity.text).isEqualTo("abc")
        assertThat(variableEntity.ref).isEqualTo(createDummyReference("foo"))
        assertThat(variableEntity.bools).isEqualTo(setOf(true, false))
        assertThat(variableEntity.nums).isEqualTo(setOf(1.0, 2.0))

        val e = assertFailsWith<InvalidFieldNameException> {
            variableEntity.getSingletonValue("num")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "${DummyVariableEntity.ENTITY_CLASS_NAME} does not have a singleton field called \"num\"."
        )
    }

    private fun createDummyReference(id: String) = Reference(
        DummyEntity,
        arcs.core.storage.Reference(id, DummyStorageKey(id), VersionMap("id" to 1))
    )
}
