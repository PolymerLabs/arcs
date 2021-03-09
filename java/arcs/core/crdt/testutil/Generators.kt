package arcs.core.crdt.testutil

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSet.DataValue
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.testutil.FieldTypeWithReferencedSchemas
import arcs.core.data.testutil.SchemaWithReferencedSchemas
import arcs.core.data.util.toReferencable
import arcs.core.testutil.FuzzingRandom
import arcs.core.testutil.Generator
import arcs.core.testutil.MapOf
import arcs.core.testutil.Transformer

/** Generate a [CrdtEntity] given a generator for the [VersionMap] and [RawEntity]. */
class CrdtEntityAtFixedVersionGenerator(
  val version: Generator<VersionMap>,
  val rawEntity: Generator<RawEntity>
) : Generator<CrdtEntity> {
  override operator fun invoke(): CrdtEntity {
    return CrdtEntity.newAtVersionForTest(
      version(),
      rawEntity()
    )
  }
}

/**
 * A [Generator] that produces [CrdtEntity.Data]. This [Generator] attempts to be
 * as correct as possible; each field will have values that match the randomly
 * selected type of that field, and those values will have versionMaps that are subsets of the
 * global entity versionMap.
 */
class CrdtEntityDataGenerator(
  val s: FuzzingRandom,
  val version: Generator<VersionMap>,
  val singletonFields: Generator<Set<String>>,
  val collectionFields: Generator<Set<String>>,
  val collectionSize: Generator<Int>,
  val fieldType: Generator<FieldTypeWithReferencedSchemas>,
  val fieldValue: Transformer<FieldTypeWithReferencedSchemas, Referencable>,
  val creationTimestamp: Generator<Long>,
  val expirationTimestamp: Generator<Long>,
  val id: Generator<String>
) : Generator<CrdtEntity.Data> {
  private fun referenceFromValue(
    type: FieldType,
    value: Referencable
  ): CrdtEntity.Reference {
    if (type.tag == FieldType.Tag.List || type.tag == FieldType.Tag.InlineEntity) {
      return CrdtEntity.Reference.wrapReferencable(value)
    } else {
      return CrdtEntity.Reference.buildReference((value))
    }
  }

  private fun makeCrdtSetData(
    type: FieldTypeWithReferencedSchemas,
    numValues: Int,
    versionGen: () -> VersionMap
  ): MutableMap<ReferenceId, CrdtSet.DataValue<CrdtEntity.Reference>> {
    val map = mutableMapOf<ReferenceId, CrdtSet.DataValue<CrdtEntity.Reference>>()
    (1..numValues).forEach {
      val value = fieldValue(type)
      map[value.id] = CrdtSet.DataValue(versionGen(), referenceFromValue(type.fieldType, value))
    }
    return map
  }

  override fun invoke(): CrdtEntity.Data {
    val singletons = mutableMapOf<FieldName, CrdtSingleton<CrdtEntity.Reference>>()
    val versionMapDominatedBy = VersionMapDominatedBy(s)
    val parentVersion = version()
    singletonFields().forEach {
      val singletonData = CrdtSingleton.DataImpl(
        parentVersion,
        makeCrdtSetData(fieldType(), 1) { versionMapDominatedBy(parentVersion) }
      )
      singletons[it] = CrdtSingleton.createWithData(singletonData)
    }

    val collections = mutableMapOf<FieldName, CrdtSet<CrdtEntity.Reference>>()
    collectionFields().forEach {
      val collectionData = CrdtSet.DataImpl(
        parentVersion,
        makeCrdtSetData(fieldType(), collectionSize()) { versionMapDominatedBy(parentVersion) }
      )
      collections[it] = CrdtSet.createWithData(collectionData)
    }
    return CrdtEntity.Data(
      parentVersion,
      singletons,
      collections,
      creationTimestamp(),
      expirationTimestamp(),
      id()
    )
  }
}

/** A [Generator] that produces [CrdtEntity]s. */
class CrdtEntityGenerator(
  val data: Generator<CrdtEntity.Data>
) : Generator<CrdtEntity> {
  override fun invoke() = CrdtEntity(data())
}

/** Generate a [VersionMap] with a single actor given generators for the actor and version. */
class SingleActorVersionMapGenerator(
  val actor: Generator<String>,
  val version: Generator<Int>
) : Generator<VersionMap> {
  override operator fun invoke(): VersionMap {
    return VersionMap(actor() to version())
  }
}

/**
 * Generates a [VersionMap] with a randomly selected number of entries, and random actor and
 * version for each entry.
 */
class VersionMapGenerator(
  val actor: Generator<String>,
  val version: Generator<Int>,
  val entries: Generator<Int>
) : Generator<VersionMap> {
  override operator fun invoke(): VersionMap {
    return VersionMap(MapOf(actor, version, entries)())
  }
}

/** Generates a random [VersionMap] that is dominated by the provided input [VersionMap] */
class VersionMapDominatedBy(val s: FuzzingRandom) : Transformer<VersionMap, VersionMap>() {
  override fun invoke(i: VersionMap): VersionMap {
    return VersionMap(i.backingMap.map { it.key to s.nextInRange(0, it.value) }.toMap())
  }
}

/**
 * Generate a [RawEntity] given generators for the id, singletons, collections, creationTimestamp,
 * and expirationTimestamp.
 */
class RawEntityGenerator(
  val id: Generator<String>,
  val singletons: Generator<Map<String, Referencable>>,
  val collections: Generator<Map<String, Set<Referencable>>>,
  val creationTimestamp: Generator<Long>,
  val expirationTimestamp: Generator<Long>
) : Generator<RawEntity> {
  override operator fun invoke(): RawEntity {
    return RawEntity(
      id = id(),
      singletons = singletons(),
      collections = collections(),
      creationTimestamp = creationTimestamp(),
      expirationTimestamp = expirationTimestamp()
    )
  }
}

/**
 * Generate a [RawEntity] that matches a given [Schema]. Because [Schema]s can reference or inline
 * sub-[Schema]s, and these are not contained in the data structure but instead referenced by
 * hash, a [SchemaWithReferencedSchemas] is required that lists both the [Schema] to match
 * the [RawEntity] to, and all other referenced [Schema]s, indexed by hash.
 *
 * Requires a source of [id] values, collection sizes, [creationTimestamp] and
 * [expirationTimestamp], and a [Transformer] to generate [Referencable] values from
 * [FieldType]s (noting that [FieldType] is represented by [FieldTypeWithReferencedSchemas] for the
 * same reason as above).
 */
class RawEntityFromSchema(
  val id: Generator<String>,
  val referencable: Transformer<FieldTypeWithReferencedSchemas, Referencable>,
  val collectionSize: Generator<Int>,
  val creationTimestamp: Generator<Long>,
  val expirationTimestamp: Generator<Long>
) : Transformer<SchemaWithReferencedSchemas, RawEntity>() {
  override fun invoke(i: SchemaWithReferencedSchemas): RawEntity {
    val singletons = i.schema.fields.singletons.mapValues {
      referencable(FieldTypeWithReferencedSchemas(it.value, i.schemas))
    }
    val collections = i.schema.fields.collections.mapValues {
      (1..collectionSize()).map { idx ->
        referencable(FieldTypeWithReferencedSchemas(it.value, i.schemas))
      }.toSet()
    }
    return RawEntity(id(), singletons, collections, creationTimestamp(), expirationTimestamp())
  }
}

/** Generate a [Referencable] given a generator for the id. */
class ReferencableGenerator(
  val id: Generator<String>
) : Generator<Referencable> {
  override fun invoke(): Referencable {
    return id().toReferencable()
  }
}

/** Generate a [CrdtSet.DataValue] given generators for the versionMap and value. */
class DataValueGenerator<T : Referencable>(
  val versionMap: Generator<VersionMap>,
  val value: Generator<T>
) : Generator<DataValue<T>> {
  override fun invoke(): DataValue<T> {
    return DataValue(versionMap(), value())
  }
}
