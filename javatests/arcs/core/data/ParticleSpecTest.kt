package arcs.core.data

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleSpecTest {
  @Test
  fun constructor_defaults_noClaims() {
    val spec = ParticleSpec("FooSpec", mapOf(), "path.to.Foo")

    assertThat(spec.claims).isEmpty()
  }

  @Test
  fun constructor_defaults_noChecks() {
    val spec = ParticleSpec("FooSpec", mapOf(), "path.to.Foo")

    assertThat(spec.checks).isEmpty()
  }

  @Test
  fun constructor_defaults_noAnnotations() {
    val spec = ParticleSpec("FooSpec", mapOf(), "path.to.Foo")

    assertThat(spec.annotations).isEmpty()
  }

  @Test
  fun dataflowType_ingress() {
    val spec = createSpec(annotations = listOf(Annotation.ingress))

    assertThat(spec.dataflowType).isEqualTo(ParticleDataflowType.Ingress)
  }

  @Test
  fun dataflowType_egress() {
    val spec = createSpec(annotations = listOf(Annotation.createEgress()))

    assertThat(spec.dataflowType).isEqualTo(ParticleDataflowType.Egress)
  }

  @Test
  fun dataflowType_isolated() {
    val spec = createSpec(annotations = listOf(Annotation.isolated))

    assertThat(spec.dataflowType).isEqualTo(ParticleDataflowType.Isolated)
  }

  @Test
  fun dataflowType_defaultsToIngressAndEgress() {
    assertThat(createSpec().dataflowType).isEqualTo(ParticleDataflowType.IngressAndEgress)
  }

  @Test
  fun dataflowType_cannotBeIsolatedAndIngress() {
    val spec = createSpec(annotations = listOf(Annotation.isolated, Annotation.ingress))

    assertFailsWith<IllegalArgumentException> { spec.dataflowType }
  }

  @Test
  fun dataflowType_cannotBeIsolatedAndEgress() {
    val spec = createSpec(annotations = listOf(Annotation.isolated, Annotation.createEgress()))

    assertFailsWith<IllegalArgumentException> { spec.dataflowType }
  }

  @Test
  fun egressType_noType_returnsNull() {
    val spec = createSpec()

    assertThat(spec.egressType).isNull()
  }

  @Test
  fun egressType_typeNotStated_returnsNull() {
    val spec = createSpec(annotations = listOf(Annotation.createEgress()))

    assertThat(spec.egressType).isNull()
  }

  @Test
  fun egressType_typeStated_returnsTypeName() {
    val spec = createSpec(annotations = listOf(Annotation.createEgress("MyEgressType")))

    assertThat(spec.egressType).isEqualTo("MyEgressType")
  }

  @Test
  fun egressType_dataflowTypeIsIngress_returnsNull() {
    val spec = createSpec(annotations = listOf(Annotation.ingress))

    assertThat(spec.egressType).isNull()
  }

  @Test
  fun egressType_dataflowTypeIsIngressWithArgument_returnsNull() {
    val spec = createSpec(annotations = listOf(
      Annotation("ingress", mapOf("type" to AnnotationParam.Str("MyIngressType")))
    ))

    assertThat(spec.egressType).isNull()
  }

  @Test
  fun egressType_dataflowTypeIsIsolated_returnsNull() {
    val spec = createSpec(annotations = listOf(Annotation.isolated))

    assertThat(spec.egressType).isNull()
  }

  @Test
  fun egressType_dataflowTypeIsIngressAndEgressWithoutArgument_returnsNull() {
    val spec = createSpec(
      annotations = listOf(
        Annotation.createEgress(),
        Annotation.ingress
      )
    )

    assertThat(spec.egressType).isNull()
  }

  @Test
  fun egressType_dataflowTypeIsIngressWithArgumentAndEgressWithoutArgument_returnsNull() {
    val spec = createSpec(
      annotations = listOf(
        Annotation.createEgress(),
        Annotation("ingress", mapOf("type" to AnnotationParam.Str("MyIngressType")))
      )
    )

    assertThat(spec.egressType).isNull()
  }

  @Test
  fun egressType_dataflowTypeIsIngressAndEgressWithArgument_returnsTypeName() {
    val spec = createSpec(
      annotations = listOf(
        Annotation.createEgress("MyEgressType"),
        Annotation.ingress
      )
    )

    assertThat(spec.egressType).isEqualTo("MyEgressType")
  }

  companion object {
    fun createSpec(
      name: String = "Foo",
      annotations: List<Annotation> = emptyList()
    ): ParticleSpec {
      return ParticleSpec(
        name = name,
        connections = emptyMap(),
        location = "",
        annotations = annotations
      )
    }
  }
}
