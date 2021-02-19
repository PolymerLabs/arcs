package arcs.core.data.testutil

import arcs.core.common.Referencable
import arcs.core.data.CollectionType
import arcs.core.data.CreatableStorageKey
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SingletonType
import arcs.core.data.util.toReferencable
import arcs.core.entity.EntityBaseSpec
import arcs.core.host.ParticleRegistration
import arcs.core.host.testutil.ParticleRegistrationGenerator
import arcs.core.storage.StorageKey
import arcs.core.testutil.ChooseFromList
import arcs.core.testutil.FuzzingRandom
import arcs.core.testutil.Generator
import arcs.core.testutil.Transformer
import arcs.core.testutil.Value
import arcs.core.testutil.midSizedString
import arcs.core.type.Type
import arcs.core.util.BigInt

/**
 * Generators for arcs.core.data classes.
 */

/**
 * Generate a [Plan.Particle] given a generator for name, location and connection map.
 */
class PlanParticleGenerator(
  val name: Generator<String>,
  val location: Generator<String>,
  val connections: Generator<Map<String, Plan.HandleConnection>>
) : Generator<Plan.Particle> {
  override operator fun invoke(): Plan.Particle {
    return Plan.Particle(name(), location(), connections())
  }
}

/**
 * Generate a [Plan.Handle] given a generator for [StorageKey] and [Type].
 */
class HandleGenerator(
  val storageKey: Generator<StorageKey>,
  val type: Generator<Type>
) : Generator<Plan.Handle> {
  override operator fun invoke(): Plan.Handle {
    return Plan.Handle(storageKey(), type(), emptyList())
  }
}

/**
 * Generate a [Plan.HandleConnection] given a generator for [Plan.Handle] and [Type], and a
 * transformer to generate compatible [HandleMode] given [Type].
 */
class HandleConnectionGenerator(
  val handle: Generator<Plan.Handle>,
  val mode: Transformer<Type, HandleMode>,
  val type: Generator<Type>
) : Generator<Plan.HandleConnection> {
  override operator fun invoke(): Plan.HandleConnection {
    val theType = type()
    return Plan.HandleConnection(
      handle(),
      mode(theType),
      theType,
      emptyList()
    )
  }
}

/**
 * Given a list of [Plan.Particle]s, generate a [Plan].
 */
class PlanFromParticles(val s: FuzzingRandom) : Transformer<List<Plan.Particle>, Plan>() {
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
class CreatableStorageKeyGenerator(
  val nameFromManifest: Generator<String>
) : Generator<StorageKey> {
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
  val s: FuzzingRandom,
  val name: Generator<String>,
  val connections: Generator<Map<String, Plan.HandleConnection>>
) : Generator<ParticleInfo> {
  override operator fun invoke(): ParticleInfo {
    val theName = name()
    val theConnections = connections()
    val emptySchema = Schema(
      emptySet(),
      SchemaFields(emptyMap(), emptyMap()),
      "empty-hash"
    )
    val theEntities = theConnections.mapValues { setOf(EntityBaseSpec(emptySchema)) }
    val registration = ParticleRegistrationGenerator(s, Value(theName), Value(theEntities))()
    val location = registration.first.id
    val particle = PlanParticleGenerator(
      Value(theName),
      Value(location),
      Value(theConnections)
    )()
    return ParticleInfo(registration, particle)
  }
}

/**
 * Given a [Type], generates a valid [HandleMode] for that [Type].
 */
class HandleModeFromType(val s: FuzzingRandom) : Transformer<Type, HandleMode>() {
  override operator fun invoke(i: Type): HandleMode =
    when (i) {
      is SingletonType<*> -> ChooseFromList(
        s,
        listOf(
          HandleMode.Read,
          HandleMode.Write
        )
      )()
      is CollectionType<*> -> ChooseFromList(
        s,
        listOf(
          HandleMode.Read,
          HandleMode.Write,
          HandleMode.Query,
          HandleMode.ReadWrite,
          HandleMode.ReadQuery,
          HandleMode.WriteQuery,
          HandleMode.ReadWriteQuery
        )
      )()
      else -> throw UnsupportedOperationException(
        "I don't know how to generate HandleModes for type $i"
      )
    }
}

/**
 * A [Generator] of primitive [FieldType]s.
 *
 * Note that some [FieldType]s reference schema hashes that are expected to be in a global
 * registry. For this reason, all [FieldType] generators return [FieldTypeWithReferencedSchemas]
 * objects that encapsulate both a [FieldType] and any schemas referenced by that [FieldType].
 */
class PrimitiveFieldTypeGenerator(
  val s: FuzzingRandom
) : Generator<FieldTypeWithReferencedSchemas> {
  override fun invoke(): FieldTypeWithReferencedSchemas {
    val primitiveType = ChooseFromList(s, PrimitiveType.values().toList())()
    return FieldTypeWithReferencedSchemas.justType(FieldType.Primitive(primitiveType))
  }
}

/**
 * A [Generator] of Tuple [FieldType]s.
 *
 * Note that some [FieldType]s reference schema hashes that are expected to be in a global
 * registry. For this reason, all [FieldType] generators return [FieldTypeWithReferencedSchemas]
 * objects that encapsulate both a [FieldType] and any schemas referenced by that [FieldType].
 * TODO(b/180656030): Tuple support might be going away? Remove this Generator if so.
 */
class TupleFieldTypeGenerator(
  val s: FuzzingRandom,
  val fields: Generator<FieldTypeWithReferencedSchemas>,
  val size: Generator<Int>
) : Generator<FieldTypeWithReferencedSchemas> {
  override fun invoke(): FieldTypeWithReferencedSchemas {
    val tupleFields = (1..size()).map { fields() }
    return FieldTypeWithReferencedSchemas(
      FieldType.Tuple(tupleFields.map { it.fieldType }),
      tupleFields.map { it.schemas }.foldRight(emptyMap()) { a, b -> a.plus(b) }
    )
  }
}

/**
 * A [Generator] of ListOf [FieldType]s.
 *
 * Note that some [FieldType]s reference schema hashes that are expected to be in a global
 * registry. For this reason, all [FieldType] generators return [FieldTypeWithReferencedSchemas]
 * objects that encapsulate both a [FieldType] and any schemas referenced by that [FieldType].
 */
class ListFieldTypeGenerator(
  val field: Generator<FieldTypeWithReferencedSchemas>
) : Generator<FieldTypeWithReferencedSchemas> {
  override fun invoke(): FieldTypeWithReferencedSchemas {
    val memberType = field()
    return FieldTypeWithReferencedSchemas(
      FieldType.ListOf(memberType.fieldType),
      memberType.schemas
    )
  }
}

/**
 * A [Generator] of [FieldType]s. Note that this does not currently generate references
 * or inline entities.
 *
 * Note that some [FieldType]s reference schema hashes that are expected to be in a global
 * registry. For this reason, all [FieldType] generators return [FieldTypeWithReferencedSchemas]
 * objects that encapsulate both a [FieldType] and any schemas referenced by that [FieldType].
 */
class FieldTypeGenerator(val s: FuzzingRandom) : Generator<FieldTypeWithReferencedSchemas> {
  override fun invoke(): FieldTypeWithReferencedSchemas {
    return ChooseFromList(
      s,
      listOf(
        PrimitiveFieldTypeGenerator(s),
        ListFieldTypeGenerator(PrimitiveFieldTypeGenerator(s))
      )
    ).invoke().invoke()
  }
}

/**
 * A [Transformer] that, given a [FieldTypeWithReferencedSchemas] can produce [Referencable]
 * objects with appropriate data.
 *
 * Note that this does not currently generate data for inline entity or reference [FieldType]s.
 */
class ReferencableFromFieldType(
  val s: FuzzingRandom,
  val listLength: Generator<Int>
) : Transformer<FieldTypeWithReferencedSchemas, Referencable>() {
  override fun invoke(fieldType: FieldTypeWithReferencedSchemas): Referencable {
    when (fieldType.fieldType) {
      is FieldType.Primitive -> {
        return when (fieldType.fieldType.primitiveType) {
          PrimitiveType.Boolean -> s.nextBoolean().toReferencable()
          PrimitiveType.BigInt -> BigInt.valueOf(s.nextLong()).toReferencable()
          PrimitiveType.Byte -> s.nextByte().toReferencable()
          PrimitiveType.Char -> s.nextChar().toReferencable()
          PrimitiveType.Double -> s.nextDouble().toReferencable()
          PrimitiveType.Duration -> s.nextLong().toReferencable()
          PrimitiveType.Float -> s.nextFloat().toReferencable()
          PrimitiveType.Instant -> s.nextLong().toReferencable()
          PrimitiveType.Int -> s.nextInt().toReferencable()
          PrimitiveType.Long -> s.nextLong().toReferencable()
          PrimitiveType.Number -> s.nextDouble().toReferencable()
          PrimitiveType.Short -> s.nextShort().toReferencable()
          PrimitiveType.Text -> midSizedString(s)().toReferencable()
        }
      }
      is FieldType.Tuple -> {
        throw UnsupportedOperationException("Values for Tuples not yet implemented")
      }
      is FieldType.ListOf -> {
        val primitiveField = FieldTypeWithReferencedSchemas(
          fieldType.fieldType.primitiveType,
          fieldType.schemas
        )
        return (1..listLength()).map { invoke(primitiveField) }.toReferencable(fieldType.fieldType)
      }
      else -> TODO("b/180656030: values of Tuple type aren't yet supported")
    }
  }
}

/**
 * A data class that encapsulates a [FieldType] with all [Schema] objects referenced by
 * that [FieldType].
 */
data class FieldTypeWithReferencedSchemas(
  val fieldType: FieldType,
  val schemas: Map<String, Schema>
) {
  companion object {
    val SENTINEL_EMPTY_MAP = emptyMap<String, Schema>()
    fun justType(fieldType: FieldType): FieldTypeWithReferencedSchemas {
      return FieldTypeWithReferencedSchemas(fieldType, SENTINEL_EMPTY_MAP)
    }
  }
}
