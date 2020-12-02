package arcs.core.data

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleSpecTest {

  @Test
  fun reasonableDefaultArguments() {
    val spec = ParticleSpec(
      name = "particleSpecName",
      connections = emptyMap<String, HandleConnectionSpec>(),
      location = "some.location"
    )
    assertThat(spec.name).isEqualTo("particleSpecName")
    assertThat(spec.connections).isEqualTo(emptyMap<String, HandleConnectionSpec>())
    assertThat(spec.location).isEqualTo("some.location")
    assertThat(spec.claims).isEqualTo(emptyList<Claim>())
    assertThat(spec.checks).isEqualTo(emptyList<Check>())
    assertThat(spec.annotations).isEqualTo(emptyList<Annotation>())
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
  fun egressType_for_egress_null() {
    val spec = createSpec(annotations = listOf(Annotation.createEgress()))

    assertThat(spec.dataflowType).isEqualTo(ParticleDataflowType.Egress)
    assertThat(spec.egressType).isEqualTo(null)
  }

  @Test
  fun egressType_for_egress_non_null() {
    val spec = createSpec(annotations = listOf(Annotation.createEgress("EgressTypeName")))

    assertThat(spec.dataflowType).isEqualTo(ParticleDataflowType.Egress)
    assertThat(spec.egressType).isEqualTo("EgressTypeName")
  }

  @Test
  fun egressType_for_isolated_is_null() {
    val spec = createSpec(annotations = listOf(Annotation.isolated))

    assertThat(spec.egressType).isEqualTo(null)
  }

  @Test
  fun egressType_for_ingress_is_null() {
    val spec = createSpec(annotations = listOf(Annotation.ingress))

    assertThat(spec.egressType).isEqualTo(null)
  }

  @Test
  fun egressType_for_egress_and_ingress_non_null() {
    val spec = createSpec(annotations = listOf(Annotation.ingress, Annotation.createEgress("EgressTypeName")))

    assertThat(spec.dataflowType).isEqualTo(ParticleDataflowType.IngressAndEgress)
    assertThat(spec.egressType).isEqualTo("EgressTypeName")
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
