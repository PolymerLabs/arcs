package arcs.core.entity

import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith


@RunWith(JUnit4::class)
abstract class EntityTestBase<T : EntityBase> {
    protected lateinit var entity: Dummy<T>

    @Before
    abstract fun setUp()

    @After
    fun tearDown() {
        SchemaRegistry.clearForTest()
    }

    @Test
    fun singletonFields_boolean() {
        assertThat(entity.bool).isNull()
        entity.bool = true
        assertThat(entity.bool).isTrue()

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setSingletonValueForTest("bool", 1.0)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Boolean for ${entity::class.java.simpleName}.bool, but received 1.0."
        )
    }

    @Test
    fun singletonFields_number() {
        assertThat(entity.num).isNull()
        entity.num = 12.0
        assertThat(entity.num).isEqualTo(12.0)

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setSingletonValueForTest("num", "abc")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Double for ${entity::class.java.simpleName}.num, but received abc."
        )
    }

    @Test
    fun singletonFields_text() {
        assertThat(entity.text).isNull()
        entity.text = "abc"
        assertThat(entity.text).isEqualTo("abc")

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setSingletonValueForTest("text", true)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected String for ${entity::class.java.simpleName}.text, but received true."
        )
    }

    @Test
    fun singletonFields_getInvalidFieldName() {
        val e = assertFailsWith<InvalidFieldNameException> {
            entity.getSingletonValueForTest("not_a_real_field")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "${entity::class.java.simpleName} does not have a singleton field called \"not_a_real_field\"."
        )
    }

    @Test
    fun singletonFields_setInvalidFieldName() {
        val e = assertFailsWith<InvalidFieldNameException> {
            entity.setSingletonValueForTest("not_a_real_field", "x")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "${entity::class.java.simpleName} does not have a singleton field called \"not_a_real_field\"."
        )
    }

    @Test
    fun collectionFields_boolean() {
        assertThat(entity.bools).isEmpty()
        entity.bools = setOf(true)
        assertThat(entity.bools).containsExactly(true)

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setCollectionValueForTest("bools", setOf(true, 1.0))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Boolean for ${entity::class.java.simpleName}.bools, but received 1.0."
        )
    }

    @Test
    fun collectionFields_number() {
        assertThat(entity.nums).isEmpty()
        entity.nums = setOf(1.0, 2.0)
        assertThat(entity.nums).containsExactly(1.0, 2.0)

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setCollectionValueForTest("nums", setOf(1.0, "abc"))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Double for ${entity::class.java.simpleName}.nums, but received abc."
        )
    }

    @Test
    fun collectionFields_text() {
        assertThat(entity.texts).isEmpty()
        entity.texts = setOf("a", "b")
        assertThat(entity.texts).containsExactly("a", "b")

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setCollectionValueForTest("texts", setOf("a", true))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected String for ${entity::class.java.simpleName}.texts, but received true."
        )
    }

    @Test
    fun collectionFields_getInvalidFieldName() {
        val e = assertFailsWith<InvalidFieldNameException> {
            entity.getCollectionValueForTest("not_a_real_field")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "${entity::class.java.simpleName} does not have a collection field called \"not_a_real_field\"."
        )
    }

    @Test
    fun collectionFields_setInvalidFieldName() {
        val e = assertFailsWith<InvalidFieldNameException> {
            entity.setCollectionValueForTest("not_a_real_field", setOf("x"))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "${entity::class.java.simpleName} does not have a collection field called \"not_a_real_field\"."
        )
    }

    @Test
    fun singletonFields_ref() {
        assertThat(entity.ref).isNull()
        val ref = createReference("foo")
        entity.ref = ref
        assertThat(entity.ref).isEqualTo(ref)

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setSingletonValueForTest("ref", true)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Reference for ${entity::class.java.simpleName}.ref, but received true."
        )
    }

    @Test
    fun collectionFields_ref() {
        assertThat(entity.refs).isEmpty()
        val ref1 = createReference("ref1")
        val ref2 = createReference("ref2")
        entity.refs = setOf(ref1, ref2)
        assertThat(entity.refs).containsExactly(ref1, ref2)

        val e = assertFailsWith<IllegalArgumentException> {
            entity.setCollectionValueForTest("refs", setOf(ref1, "a"))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Reference for ${entity::class.java.simpleName}.refs, but received a."
        )
    }

    @Test
    abstract fun serializeRoundTrip()

    abstract fun createReference(id: String): Reference<T>

}
