package arcs.core.host

import arcs.sdk.Particle
import kotlin.reflect.KClass

class TestHost(vararg particles: KClass<out Particle>) :
    AbstractArcHost(particles.toIdentifierList())
