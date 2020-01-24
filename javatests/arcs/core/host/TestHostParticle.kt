package arcs.core.host

import arcs.sdk.Particle
import com.google.auto.service.AutoService

@AutoService(Particle::class)
@RunInTestHost
class TestHostParticle : Particle
