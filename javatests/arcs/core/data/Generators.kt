package arcs.core.data

import arcs.core.testutil.A
import arcs.core.testutil.Seed
import arcs.core.testutil.T

class PlanParticleGenerator(val name: A<String>, val location: A<String>) : A<Plan.Particle> {
  override operator fun invoke(): Plan.Particle {
    return Plan.Particle(this.name(), this.location(), emptyMap())
  }
}

class PlanFromParticles(val s: Seed): T<List<Plan.Particle>, Plan>  {
  override operator fun invoke(i: List<Plan.Particle>): Plan {
    return Plan(
      i.toList(),
      emptyList(),
      emptyList()
    )
  }
}