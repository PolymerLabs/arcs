package arcs.core.crdt

import arcs.android.crdt.Referencable
import arcs.core.data.Plan
import arcs.core.data.RawEntity
import arcs.core.testutil.FuzzingRandom
import arcs.core.testutil.Generator

/**
 * Generate a [Plan.Particle] given a generator for name, location and connection map.
 */
class CrdtEntityGenerator(
  val version: Generator<VersionMap>,
  val singletons: List<Generator<Map<String, Referencable>>>,
  val collections: List<Generator<String>>,

) : Generator<CrdtEntity> {
  override operator fun invoke(): CrdtEntity {
    return CrdtEntity(
      version(),
      RawEntity(
        id = "an-id",
        singletons = mapOf("foo" to "foo1"),
        collections = mapOf(
          "bar" to setOf(CrdtEntity.ReferenceImpl("barRef1Merge1"), CrdtEntity.ReferenceImpl("barRef2Merge1"))
        )
      )
    )
  }
}

class VersionMapGenerator(
  val actor: Generator<String>,
  val version: Generator<Int>
) : Generator<VersionMap>{
  override operator fun invoke(): VersionMap {
    return VersionMap(actor() to version())
  }
}

class MapOfStringToReferencableGenerator(
  val name: Generator<String>,
  val reference: Generator<Referencable>,
  val s: FuzzingRandom
) {
  override operator fun invoke(): Map<String, Referencable> {
    val size = s.nextInt()
    
  }
}
