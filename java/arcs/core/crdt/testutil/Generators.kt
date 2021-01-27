package arcs.core.crdt.testutil

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.testutil.Generator

/**
 * Generate a [CrdtEntity] given a generator for the [VersionMap] and [RawEntity].
 */
class CrdtEntityGenerator(
  val version: Generator<VersionMap>,
  val rawEntity: Generator<RawEntity>
) : Generator<CrdtEntity> {
  override operator fun invoke(): CrdtEntity {
    return CrdtEntity(
      version(),
      rawEntity()
    )
  }
}

/**
 * Generate a [VersionMap] with a single actor given generators for the actor and version.
 */
class SingleActorVersionMapGenerator(
  val actor: Generator<String>,
  val version: Generator<Int>
) : Generator<VersionMap> {
  override operator fun invoke(): VersionMap {
    return VersionMap(actor() to version())
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
      id = "id",
      singletons = singletons(),
      collections = collections(),
      creationTimestamp = creationTimestamp(),
      expirationTimestamp = expirationTimestamp()
    )
  }
}

/**
 * Generate a [Referencable] given a generator for the id.
 */
class ReferencableGenerator(
  val id: Generator<String>
) : Generator<Referencable> {
  override fun invoke(): Referencable {
    return CrdtEntity.ReferenceImpl(id())
  }
}
