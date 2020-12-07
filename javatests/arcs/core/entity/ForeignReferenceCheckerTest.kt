package arcs.core.entity

import arcs.core.data.RawEntity
import arcs.core.data.Schema.Companion.EMPTY
import arcs.core.data.SchemaName
import arcs.core.entity.testutil.DummyEntity
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class ForeignReferenceCheckerTest {

  private val spec = object : EntitySpec<Entity> {
    override val SCHEMA = EMPTY.copy(names = setOf(SchemaName("schemaName")))
    override fun deserialize(data: RawEntity) = throw UnsupportedOperationException()
  }
  private val foreignReferenceChecker: ForeignReferenceChecker =
    ForeignReferenceCheckerImpl(mapOf(spec.SCHEMA to { id -> id == "valid" }))

  @Test
  fun registerChecker_canCheck() = runBlocking {
    // Valid ID.
    assertThat(foreignReferenceChecker.check(spec.SCHEMA, "valid")).isTrue()

    // Invalid ID.
    assertThat(foreignReferenceChecker.check(spec.SCHEMA, "invalid")).isFalse()

    // Unregistered schema.
    val e = assertFailsWith<IllegalStateException> {
      foreignReferenceChecker.check(EMPTY, "invalid")
    }
    assertThat(e.message).isEqualTo("Foreign type not registered: {}.")
  }

  @Test
  fun schemaWithFields_throws() {
    val e = assertFailsWith<IllegalStateException> {
      ForeignReferenceCheckerImpl(mapOf(DummyEntity.SCHEMA to { id -> id == "valid" }))
    }
    assertThat(e.message).isEqualTo("Only empty schemas can be used for foreign references.")
  }
}
