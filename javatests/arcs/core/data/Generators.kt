package arcs.core.data

import arcs.core.storage.StorageKey
import arcs.core.testutil.A
import arcs.core.testutil.Seed
import arcs.core.testutil.T
import arcs.core.type.Type

class PlanParticleGenerator(val name: A<String>, val location: A<String>) : A<Plan.Particle> {
  override operator fun invoke(): Plan.Particle {
    return Plan.Particle(name(), location(), emptyMap())
  }
}

class HandleGenerator(val storageKey: A<StorageKey>, val type: A<Type>): A<Plan.Handle> {
  override operator fun invoke(): Plan.Handle {
    return Plan.Handle(storageKey(), type(), emptyList())
  }
}

class PlanFromParticles(val s: Seed, val handles: A<List<Plan.Handle>>): T<List<Plan.Particle>, Plan>()  {
  override operator fun invoke(i: List<Plan.Particle>): Plan {
    return Plan(
      i.toList(),
      handles(),
      emptyList()
    )
  }
}

class CreatableStorageKeyGenerator(val nameFromManifest: A<String>): A<CreatableStorageKey> {
  override operator fun invoke(): CreatableStorageKey {
    return CreatableStorageKey(nameFromManifest())
  }
}