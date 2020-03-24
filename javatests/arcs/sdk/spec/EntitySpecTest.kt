package arcs.sdk.spec

import arcs.core.common.Id
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.util.toReferencable
import arcs.core.entity.SchemaRegistry
import arcs.sdk.Reference
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias Foo = EntitySpecParticle_Foo
private typealias Bar = EntitySpecParticle_Bars

/** Specification tests for entities. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class EntitySpecTest {

    class EntitySpecParticle : AbstractEntitySpecParticle()

    private lateinit var idGenerator: Id.Generator

    @get:Rule
    val harness = EntitySpecParticleTestHarness { EntitySpecParticle() }

    @Before
    fun setUp() = runBlockingTest {
        idGenerator = Id.Generator.newForTest("session")
        harness.start()
    }

    @Test
    fun createEmptyInstance() {
        val entity = Foo()
        assertThat(entity.bool).isFalse()
        assertThat(entity.num).isEqualTo(0.0)
        assertThat(entity.text).isEqualTo("")
        assertThat(entity.ref).isNull()
        assertThat(entity.bools).isEmpty()
        assertThat(entity.nums).isEmpty()
        assertThat(entity.texts).isEmpty()
    }

    @Test
    fun createWithFieldValues() = runBlockingTest {
        val dummyRef = createBarReference(Bar(value = "dummy"))
        val entity = Foo(
            bool = true,
            num = 123.0,
            text = "abc",
            ref = dummyRef,
            bools = setOf(false),
            nums = setOf(456.0, 789.0),
            texts = setOf("def", "ghi")
        )
        assertThat(entity.bool).isEqualTo(true)
        assertThat(entity.num).isEqualTo(123.0)
        assertThat(entity.text).isEqualTo("abc")
        assertThat(entity.ref).isEqualTo(dummyRef)
        assertThat(entity.bools).containsExactly(false)
        assertThat(entity.nums).containsExactly(456.0, 789.0)
        assertThat(entity.texts).containsExactly("def", "ghi")
    }

    @Test
    fun ensureIdentified() {
        val entity = Foo()
        assertThat(entity.entityId).isNull()

        entity.ensureIdentified(idGenerator, "handle")
        val entityId = entity.entityId

        // Check that the entity ID has been set to *something*.
        assertThat(entityId).isNotNull()
        assertThat(entityId).isNotEmpty()
        assertThat(entityId).isNotEqualTo(NO_REFERENCE_ID)
        assertThat(entityId).contains("handle")

        // Calling it again doesn't overwrite it.
        entity.ensureIdentified(idGenerator, "something-else")
        assertThat(entity.entityId).isEqualTo(entityId)
    }

    @Test
    fun copy() = runBlockingTest {
        val ref1 = createBarReference(Bar(value = "bar1"))
        val ref2 = createBarReference(Bar(value = "bar2"))
        val entity = Foo(
            bool = true,
            num = 123.0,
            text = "abc",
            ref = ref1,
            bools = setOf(false),
            nums = setOf(456.0, 789.0),
            texts = setOf("def", "ghi")
        )

        // Copying an unidentified entity should give an exact copy of the entity.
        assertThat(entity.copy()).isEqualTo(entity)

        // Copying an identified entity should reset the ID.
        entity.identify()
        val copy1 = entity.copy()
        assertThat(copy1.entityId).isNull()
        assertThat(copy1).isNotEqualTo(entity)

        // Copying an entity with replacement fields should overwrite those fields in the copy.
        val copy2 = entity.copy(
            bool = false,
            num = 456.0,
            text = "xyz",
            ref = ref2,
            bools = setOf(true),
            nums = setOf(111.0, 222.0),
            texts = setOf("aaa", "bbb")
        )
        assertThat(copy2.entityId).isNull()
        assertThat(copy2.bool).isFalse()
        assertThat(copy2.num).isEqualTo(456.0)
        assertThat(copy2.text).isEqualTo("xyz")
        assertThat(copy2.ref).isEqualTo(ref2)
        assertThat(copy2.bools).containsExactly(true)
        assertThat(copy2.nums).containsExactly(111.0, 222.0)
        assertThat(copy2.texts).containsExactly("aaa", "bbb")
    }

    @Test
    fun serialize_roundTrip() = runBlockingTest {
        val dummyRef = createBarReference(Bar(value = "dummy"))
        val entity = Foo(
            bool = true,
            num = 123.0,
            text = "abc",
            ref = dummyRef,
            bools = setOf(false),
            nums = setOf(456.0, 789.0),
            texts = setOf("def", "ghi")
        )
        val entityId = entity.identify()

        val rawEntity = entity.serialize()

        assertThat(rawEntity).isEqualTo(
            RawEntity(
                entityId,
                singletons = mapOf(
                    "bool" to true.toReferencable(),
                    "num" to 123.0.toReferencable(),
                    "text" to "abc".toReferencable(),
                    "ref" to dummyRef.toReferencable()
                ),
                collections = mapOf(
                    "bools" to setOf(false.toReferencable()),
                    "nums" to setOf(456.0.toReferencable(), 789.0.toReferencable()),
                    "texts" to setOf("def".toReferencable(), "ghi".toReferencable())
                )
            )
        )
        assertThat(Foo.deserialize(rawEntity)).isEqualTo(entity)
    }

    @Test
    fun schemaRegistry() {
        // The entity class should have registered itself statically.
        val hash = Foo.SCHEMA.hash
        assertThat(SchemaRegistry.getEntitySpec(hash)).isEqualTo(Foo)
        assertThat(SchemaRegistry.getSchema(hash)).isEqualTo(Foo.SCHEMA)
    }

    /**
     * Stores the given [Bar] entity in a collection, and then creates and returns a reference to
     * it.
     */
    private suspend fun createBarReference(bar: Bar): Reference<Bar> {
        val handle = harness.particle.handles.bars
        handle.store(bar)
        return handle.createReference(bar)
    }

    /** Generates and returns an ID for the entity. */
    private fun (Foo).identify(): String {
        assertThat(entityId).isNull()
        ensureIdentified(idGenerator, "handleName")
        assertThat(entityId).isNotNull()
        return entityId!!
    }
}
