package arcs.core.data

import arcs.core.entity.EntityBaseSpec
import arcs.core.host.ParticleRegistration
import arcs.core.host.ParticleRegistrationGenerator
import arcs.core.storage.StorageKey
import arcs.core.testutil.A
import arcs.core.testutil.ChooseFromList
import arcs.core.testutil.Seed
import arcs.core.testutil.T
import arcs.core.testutil.Value
import arcs.core.type.Type

/**
 * Generators for arcs.core.data classes.
 */

/**
 * Generate a [Plan.Particle] given a generator for name, location and connection map.
 */
class PlanParticleGenerator(
  val name: A<String>,
  val location: A<String>,
  val connections: A<Map<String, Plan.HandleConnection>>
) : A<Plan.Particle> {
  override operator fun invoke(): Plan.Particle {
    return Plan.Particle(name(), location(), connections())
  }
}

/**
 * Generate a [Plan.Handle] given a generator for [StorageKey] and [Type].
 */
class HandleGenerator(val storageKey: A<StorageKey>, val type: A<Type>) : A<Plan.Handle> {
  override operator fun invoke(): Plan.Handle {
    return Plan.Handle(storageKey(), type(), emptyList())
  }
}

/**
 * Generate a [Plan.HandleConnection] given a generator for [Plan.Handle] and [Type], and a
 * transformer to generate compatible [HandleMode] given [Type].
 */
class HandleConnectionGenerator(
  val handle: A<Plan.Handle>,
  val mode: T<Type, HandleMode>,
  val type: A<Type>
) : A<Plan.HandleConnection> {
  override operator fun invoke(): Plan.HandleConnection {
    val theType = type()
    return Plan.HandleConnection(handle(), mode(theType), theType, emptyList())
  }
}

/**
 * Given a list of [Plan.Particle]s, generate a [Plan].
 */
class PlanFromParticles(val s: Seed) : T<List<Plan.Particle>, Plan>() {
  override operator fun invoke(i: List<Plan.Particle>): Plan {
    val handles = i.flatMap { it.handles.values.map { hc -> hc.handle } }.distinct()
    return Plan(
      i.toList(), // clone list
      handles,
      emptyList()
    )
  }
}

/**
 * Generate a [CreatableStorageKey] from a manifestName generator.
 */
class CreatableStorageKeyGenerator(val nameFromManifest: A<String>) : A<StorageKey> {
  override operator fun invoke(): CreatableStorageKey {
    return CreatableStorageKey(nameFromManifest())
  }
}

/**
 * Pairs a [ParticleRegistration] with a [Plan.Particle]. These two objects need to
 * have similar information in order for a plan to successfully start:
 * - the location in Plan.Particle has to match the ParticelRegistration's ParticleIdentifier
 * - the Particle instance returned by the ParticleRegistration's ParticleConstructor needs
 * - to have a handle field with a HandleHolder that recognizes any handleConnections listed in
 * - the Plan.Particle as valid.
 *
 * Because of these interdependencies, it's useful for random test case generation to treat
 * the two structures as a pair; hence this data class.
 */
data class ParticleInfo(val registration: ParticleRegistration, val plan: Plan.Particle)

/**
 * Generates a [ParticleInfo] given a name and connection map. This generator ensures
 * that the [ParticleRegistration] and [Plan.Particle] inside the [ParticleInfo] are
 * set up such that the [Plan.Particle] correctly references the [ParticleRegistration],
 * which in turn creates a [Particle] with the correct handle structure.
 */
// TODO(shanestephens): the minimal dependency here is actually that ParticleRegistration
// needs the location of the particle (to generate the ParticleIdentifier correctly) and 
// the name of the particle and handleConnections (to generate the ParticleConstructor
// correctly). This should allow the rest of the details of connection to be filled in
// later.
// TODO(shanestephens): pass a location into ParticleRegistrationGenerator rather than extracting
// one.
class ParticleInfoGenerator(
  val s: Seed,
  val name: A<String>,
  val connections: A<Map<String, Plan.HandleConnection>>
) : A<ParticleInfo> {
  override operator fun invoke(): ParticleInfo {
    val theName = name()
    val theConnections = connections()
    val emptySchema = Schema(emptySet(), SchemaFields(emptyMap(), emptyMap()), "empty-hash")
    val theEntities = theConnections.mapValues { setOf(EntityBaseSpec(emptySchema)) }
    val registration = ParticleRegistrationGenerator(s, Value(theName), Value(theEntities))()
    val location = registration.first.id
    val particle = PlanParticleGenerator(Value(theName), Value(location), Value(theConnections))()
    return ParticleInfo(registration, particle)
  }
}

/**
 * Given a [Type], generates a valid [HandleMode] for that [Type].
 */
class HandleModeFromType(val s: Seed) : T<Type, HandleMode>() {
  override operator fun invoke(i: Type): HandleMode =
    when (i) {
      is SingletonType<*> -> ChooseFromList(s, listOf(HandleMode.Read, HandleMode.Write))()
      is CollectionType<*> -> ChooseFromList(s, listOf(
        HandleMode.Read,
        HandleMode.Write,
        HandleMode.Query,
        HandleMode.ReadWrite,
        HandleMode.ReadQuery,
        HandleMode.WriteQuery,
        HandleMode.ReadWriteQuery
      ))()
      else -> throw UnsupportedOperationException(
        "I don't know how to generate HandleModes for type $i")
    }
}
