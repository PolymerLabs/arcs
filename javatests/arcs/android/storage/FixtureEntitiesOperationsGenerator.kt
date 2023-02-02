package arcs.android.storage

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.entity.testutil.FixtureEntities
import arcs.core.testutil.FuzzingRandom
import arcs.core.testutil.Generator

/**
 * Generates a sequence of [CrdtSet.Operation<RawEntity>], using the FixtureEntity schema. The ops
 * can be applied in sequence to a CrdtSet and should all be valid.
 */
class FixtureEntitiesOperationsGenerator(
  val s: FuzzingRandom,
  val sizeGenerator: Generator<Int>
) : Generator<List<CrdtSet.Operation<RawEntity>>> {
  override fun invoke(): List<CrdtSet.Operation<RawEntity>> {
    val ops = mutableListOf<CrdtSet.Operation<RawEntity>>()
    // Keep track of the entities in the set, to generate valid remove ops.
    val entities = mutableSetOf<RawEntity>()
    repeat(sizeGenerator()) {
      when (s.nextLessThan(3)) {
        0 -> {
          val e = FixtureEntities.randomRawEntity(s)
          entities.add(e)
          ops.add(CrdtSet.Operation.Add("", VersionMap(), e))
        }
        1 -> {
          entities.randomOrNull()?.also {
            ops.add(CrdtSet.Operation.Remove("", VersionMap(), it.id))
            entities.remove(it)
          }
        }
        else -> {
          ops.add(CrdtSet.Operation.Clear("", VersionMap()))
          entities.clear()
        }
      }
    }
    return ops
  }
}
