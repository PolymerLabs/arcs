package arcs.core.data

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PlanTest {

  @Before
  fun setUp() {
    SchemaRegistry.clearForTest()
  }

  @Test
  fun registerSchemas_fromHandle_oneRegistered() {
    val plan = Plan(emptyList(), listOf(handle), emptyList())

    plan.registerSchemas()

    assertThat(SchemaRegistry.getSchema(HANDLE_SCHEMA.hash)).isEqualTo(HANDLE_SCHEMA)
  }

  @Test
  fun registerSchemas_fromParticle_twoRegistered() {
    val particle = Plan.Particle(
      "someName",
      "someLocation",
      mapOf(
        "data" to HANDLE_CONNECTION
      )
    )
    val plan = Plan(listOf(particle), emptyList(), emptyList())

    plan.registerSchemas()

    assertThat(SchemaRegistry.getSchema(HANDLE_SCHEMA.hash)).isEqualTo(HANDLE_SCHEMA)
    assertThat(SchemaRegistry.getSchema(CONNECTION_SCHEMA.hash)).isEqualTo(CONNECTION_SCHEMA)
  }

  @Test
  fun registerSchemas_fromParticleVariable_twoRegistered() {
    val variableHandleConnection = Plan.HandleConnection(
      handle = handle,
      mode = HandleMode.ReadWrite,
      type = CollectionType(TypeVariable("a", EntityType(VAR_SCHEMA)))
    )
    val particle = Plan.Particle(
      "someName",
      "someLocation",
      mapOf(
        "data" to variableHandleConnection
      )
    )
    val plan = Plan(listOf(particle), emptyList(), emptyList())

    plan.registerSchemas()

    assertThat(SchemaRegistry.getSchema(HANDLE_SCHEMA.hash)).isEqualTo(HANDLE_SCHEMA)
    assertThat(SchemaRegistry.getSchema(VAR_SCHEMA.hash)).isEqualTo(VAR_SCHEMA)
  }

  @Test
  fun registerSchema_tupleType_twoRegistered() {
    val handle = Plan.Handle(
      CreatableStorageKey("bla"),
      TupleType(SingletonType(EntityType(HANDLE_SCHEMA)), SingletonType(EntityType(VAR_SCHEMA))),
      emptyList()
    )
    val plan = Plan(emptyList(), listOf(handle), emptyList())

    plan.registerSchemas()

    assertThat(SchemaRegistry.getSchema(HANDLE_SCHEMA.hash)).isEqualTo(HANDLE_SCHEMA)
    assertThat(SchemaRegistry.getSchema(VAR_SCHEMA.hash)).isEqualTo(VAR_SCHEMA)
  }

  @Test
  fun registerSchema_nullType_oneRegistered() {
    // TypeVariable has a 'null' type for its constraint.
    val nullHandle = Plan.Handle(
      CreatableStorageKey("null"),
      TypeVariable("a"),
      emptyList()
    )
    val plan = Plan(emptyList(), listOf(handle, nullHandle), emptyList())

    plan.registerSchemas()

    assertThat(SchemaRegistry.getSchema(HANDLE_SCHEMA.hash)).isEqualTo(HANDLE_SCHEMA)
  }

  @Test
  fun arcId_singleAnnotation_returnsId() {
    val annotations = listOf(
      Annotation("arcId", mapOf("id" to AnnotationParam.Str("foo")))
    )
    val plan = Plan(emptyList(), emptyList(), annotations)

    assertThat(plan.arcId).isEqualTo("foo")
  }

  @Test
  fun arcId_multipleAnnotations_returnsFirst() {
    val annotations = listOf(
      Annotation("arcId", mapOf("id" to AnnotationParam.Str("foo"))),
      Annotation("arcId", mapOf("id" to AnnotationParam.Str("bar")))
    )

    val plan = Plan(emptyList(), emptyList(), annotations)

    assertThat(plan.arcId).isEqualTo("foo")
  }

  @Test
  fun arcId_annotationMissing_returnsNull() {
    val annotations = listOf(
      Annotation("anotherAnnotation", mapOf("id" to AnnotationParam.Str("foo")))
    )
    val plan = Plan(emptyList(), emptyList(), annotations)

    assertThat(plan.arcId).isEqualTo(null)
  }

  @Test
  fun arcId_annotationsEmpty_returnsNull() {
    val plan = Plan(emptyList(), emptyList(), emptyList())

    assertThat(plan.arcId).isEqualTo(null)
  }

  @Test
  fun arcId_annotationParamEmpty_throwsAssert() {
    val annotations = listOf(
      Annotation("arcId", emptyMap())
    )
    val plan = Plan(emptyList(), emptyList(), annotations)

    assertFailsWith<IllegalArgumentException> {
      plan.arcId
    }.also {
      assertThat(it).hasMessageThat().contains(
        "Annotation 'Annotation(name=arcId, params={}).name' missing 'id' parameter"
      )
    }
  }

  @Test
  fun arcId_annotationParamNoId_throwsAssert() {
    val annotations = listOf(
      Annotation("arcId", mapOf("notId" to AnnotationParam.Str("foo")))
    )
    val plan = Plan(emptyList(), emptyList(), annotations)

    assertFailsWith<IllegalArgumentException> {
      plan.arcId
    }.also {
      assertThat(it).hasMessageThat().contains(
        "Annotation 'Annotation(name=arcId, params={notId=Str(value=foo)}).name' " +
          "missing 'id' parameter"
      )
    }
  }

  @Test
  fun arcId_annotationParamNotAString_throwsAssert() {
    val annotations = listOf(
      Annotation("arcId", mapOf("id" to AnnotationParam.Num(10)))
    )
    val plan = Plan(emptyList(), emptyList(), annotations)

    assertFailsWith<IllegalArgumentException> {
      plan.arcId
    }.also {
      assertThat(it).hasMessageThat().contains(
        "Annotation param id must be string, instead got Num(value=10)"
      )
    }
  }

  @Test
  fun handleConnectionTtl_singleAnnotation_returnsTtl() {
    val annotations = listOf(Annotation("ttl", mapOf("value" to AnnotationParam.Str("10d"))))

    val connection = HANDLE_CONNECTION.copy(annotations = annotations)

    assertThat(connection.ttl).isEqualTo(Capability.Ttl.Days(10))
  }

  @Test
  fun handleConnectionTtl_annotationMissing_returnsInfinite() {
    val annotations = listOf(Annotation("notTtl", mapOf("value" to AnnotationParam.Str("10d"))))

    val connection = HANDLE_CONNECTION.copy(annotations = annotations)

    assertThat(connection.ttl).isEqualTo(Capability.Ttl.Infinite())
  }

  @Test
  fun handleConnectionTtl_annotationsEmpty_returnsInfinite() {
    assertThat(HANDLE_CONNECTION.ttl).isEqualTo(Capability.Ttl.Infinite())
  }

  @Test
  fun handleConnectionTtl_annotationParamEmpty_throwsAssert() {
    val annotations = listOf(Annotation("ttl", emptyMap()))

    val connection = HANDLE_CONNECTION.copy(annotations = annotations)

    assertFailsWith<IllegalArgumentException> {
      connection.ttl
    }.also {
      assertThat(it).hasMessageThat().contains(
        "Annotation 'Annotation(name=ttl, params={}).name' missing 'value' parameter"
      )
    }
  }

  @Test
  fun handleConnectionTtl_annotationParamNoValue_throwsAssert() {
    val annotations = listOf(Annotation("ttl", mapOf("notValue" to AnnotationParam.Str("10d"))))

    val connection = HANDLE_CONNECTION.copy(annotations = annotations)

    assertFailsWith<IllegalArgumentException> {
      connection.ttl
    }.also {
      assertThat(it).hasMessageThat().contains(
        "Annotation 'Annotation(name=ttl, params={notValue=Str(value=10d)}).name' " +
          "missing 'value' parameter"
      )
    }
  }

  @Test
  fun handleConnectionTtl_annotationParamNotAString_throwsAssert() {
    val annotations = listOf(Annotation("ttl", mapOf("value" to AnnotationParam.Num(12))))

    val connection = HANDLE_CONNECTION.copy(annotations = annotations)

    assertFailsWith<IllegalArgumentException> {
      connection.ttl
    }.also {
      assertThat(it).hasMessageThat().contains(
        "Annotation param value must be string, instead got Num(value=12)"
      )
    }
  }

  companion object {
    val HANDLE_SCHEMA = Schema(setOf(SchemaName("Foo")), Schema.EMPTY.fields, "handleHash")
    val CONNECTION_SCHEMA = Schema(
      setOf(SchemaName("Bar")),
      Schema.EMPTY.fields,
      "connectionHash"
    )
    val VAR_SCHEMA = Schema(setOf(SchemaName("Baz")), Schema.EMPTY.fields, "varHash")
    val handle = Plan.Handle(
      CreatableStorageKey("bla"),
      SingletonType(EntityType(HANDLE_SCHEMA)),
      emptyList()
    )
    val HANDLE_CONNECTION = Plan.HandleConnection(
      handle = handle,
      mode = HandleMode.ReadWrite,
      type = CollectionType(ReferenceType(EntityType(CONNECTION_SCHEMA)))
    )
  }
}
