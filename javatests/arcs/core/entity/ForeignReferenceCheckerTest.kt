package arcs.core.entity

import arcs.core.data.RawEntity
import arcs.core.data.Schema.Companion.EMPTY
import arcs.core.data.SchemaName
import arcs.core.storage.keys.ForeignStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ForeignReferenceCheckerTest {

    val spec = object : EntitySpec<Entity> {
        override val SCHEMA = EMPTY.copy(names = setOf(SchemaName("schemaName")))
        override fun deserialize(data: RawEntity) = throw UnsupportedOperationException()
    }

    @Test
    fun registerChecker_canCheck() {
        ForeignReferenceChecker.registerExternalEntityType(spec) {
            it == "valid"
        }

        // Valid ID.
        assertThat(ForeignReferenceChecker.check(spec.SCHEMA, "valid")).isTrue()

        // Invalid ID.
        assertThat(ForeignReferenceChecker.check(spec.SCHEMA, "invalid")).isFalse()

        // Unregistered schema.
        val e = assertFailsWith<IllegalStateException> {
            ForeignReferenceChecker.check(EMPTY, "invalid")
        }
        assertThat(e.message).isEqualTo("Foreign type not registered: {}.")
    }

    @Test
    fun schemaWithFields_throws() {
        val e = assertFailsWith<IllegalStateException> {
            ForeignReferenceChecker.registerExternalEntityType(DummyEntity) {
                it == "valid"
            }
        }
        assertThat(e.message).isEqualTo("Only empty schemas can be used for foreign references.")
    }

    @Test
    fun foreignReference() = runBlocking {
        ForeignReferenceChecker.registerExternalEntityType(spec) {
            it == "valid"
        }

        val expectedReference = Reference(
            spec,
            arcs.core.storage.Reference(
                "valid",
                storageKey = ForeignStorageKey("schemaName"),
                version = null
            )
        )
        val reference = foreignReference(spec, "valid")
        assertThat(reference).isEqualTo(expectedReference)
        assertThat(reference.toReferencable().dereference()).isEqualTo(RawEntity(id = "valid"))

        // Becomes invalid.
        ForeignReferenceChecker.registerExternalEntityType(spec) {
            false
        }
        assertThat(reference.toReferencable().dereference()).isNull()
    }

    @Test
    fun foreignReference_invalidId() {
        // Invalid ID.
        val e = assertFailsWith<InvalidForeignReferenceException> {
            foreignReference(spec, "invalid")
        }
        assertThat(e.message).isEqualTo("Cannot create reference to invalid ID invalid.")
    }

    @Test
    fun foreignReference_invalidSchema() {
        // Unregistered schema.
        val e2 = assertFailsWith<IllegalStateException> {
            foreignReference(DummyEntity, "invalid")
        }
        assertThat(e2.message).startsWith("Foreign type not registered: DummyEntity")
    }
}
