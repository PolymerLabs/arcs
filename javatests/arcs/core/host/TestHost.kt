package arcs.core.host

import arcs.jvm.host.JvmProdHost
import arcs.sdk.Particle
import kotlin.reflect.KClass

class TestHost(vararg particles: KClass<out Particle>) :
    JvmProdHost(*particles)

