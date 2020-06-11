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

    @Before
    fun setUp() {
        SchemaRegistry.register(DummyEntity.SCHEMA)
        SchemaRegistry.register(DummyVariableEntity.SCHEMA)
        entity = DummyVariableEntity()
    }

    @After
    fun tearDown() {
        SchemaRegistry.clearForTest()
    }

    @Test
    fun serializationRoundTrip() {
        val biggerEntity = DummyEntity()
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

        val biggerSerialized = biggerEntity.serialize()

        val varDummy = DummyVariableEntity()
        varDummy.deserializeForTest(biggerSerialized)

        assertThat(varDummy.text).isEqualTo("abc")
        assertThat(varDummy.ref).isEqualTo(createDummyReference("foo"))
        assertThat(varDummy.bools).isEqualTo(setOf(true, false))
        assertThat(varDummy.nums).isEqualTo(setOf(1.0, 2.0))

        val e = assertFailsWith<InvalidFieldNameException> {
            varDummy.getSingletonValueForTest("num")
        }

        assertThat(e).hasMessageThat().isEqualTo(
            "${DummyVariableEntity.ENTITY_CLASS_NAME} does not have a singleton field called \"num\"."
        )

        val backToBiggerRaw = varDummy.serialize()

        assertThat(backToBiggerRaw).isEqualTo(biggerSerialized)

        val backToBigger = DummyEntity()
        backToBigger.deserializeForTest(backToBiggerRaw)

        assertThat(backToBigger).isEqualTo(biggerEntity)
    }


    private fun createDummyReference(id: String) = Reference(
        DummyEntity,
        arcs.core.storage.Reference(id, DummyStorageKey(id), VersionMap("id" to 1))
    )
}
