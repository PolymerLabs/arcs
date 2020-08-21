package arcs.core.data

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleSpecTest {
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
