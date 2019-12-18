package arcs.core.host

import arcs.core.sdk.Particle
import com.google.auto.service.AutoService

@AutoService(Particle::class)
@ProdParticle
class TestProdParticle : Particle
