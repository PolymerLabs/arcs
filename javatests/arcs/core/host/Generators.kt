package arcs.core.host

import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.A
import arcs.core.testutil.Seed
import arcs.core.testutil.T
import arcs.jvm.host.ExplicitHostRegistry
import arcs.sdk.HandleHolderBase
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.runBlocking

class ParticleRegistrationGenerator(val s: Seed, val name: A<String>): A<ParticleRegistration> {
  override operator fun invoke(): ParticleRegistration {
    class SpecialParticle: Particle {
      override val handles: HandleHolder = HandleHolderBase(this@ParticleRegistrationGenerator.name(), emptyMap())
    }
    return ::SpecialParticle.toRegistration()
  }
}

class HostRegistryFromParticles(val s: Seed): T<List<ParticleRegistration>, HostRegistry> {
  override operator fun invoke(i: List<ParticleRegistration>): HostRegistry {
    assert(i.size > 0)
    val numHosts = this.s.nextInRange(1, i.size)
    val particleMappings = (1..numHosts).map { mutableListOf<ParticleRegistration>() }
    i.forEach { particleMappings[this.s.nextLessThan(numHosts)].add(it) }
    val registry = ExplicitHostRegistry()
    particleMappings.map { 
      TestingHost(
        SimpleSchedulerProvider(EmptyCoroutineContext),
        testStorageEndpointManager(),
        *(it.toTypedArray())
      )
    }.forEach { runBlocking { registry.registerHost(it) } }
    return registry
  }
}