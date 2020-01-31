package arcs.core.host

import arcs.core.data.ParticleSpec
import com.google.auto.service.AutoService

@AutoService(ArcHost::class)
class TestHost : AbstractArcHost() {
    override val hostName = this::class.java.canonicalName!!

    override suspend fun isHostForSpec(spec: ParticleSpec): Boolean {
        return this.registeredParticles().map { it.java.getCanonicalName() }.contains(spec.location)
    }
}
