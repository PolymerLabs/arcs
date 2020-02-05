package arcs.core.host

import arcs.jvm.host.ProdParticle
import arcs.sdk.Particle
import com.google.auto.service.AutoService

@AutoService(Particle::class)
@ProdParticle
class TestProdParticle : Particle
