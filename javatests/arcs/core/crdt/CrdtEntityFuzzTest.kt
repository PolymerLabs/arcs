package arcs.core.crdt

import arcs.core.crdt.testutil.CrdtEntityGenerator
import arcs.core.crdt.testutil.RawEntityGenerator
import arcs.core.crdt.testutil.ReferencableGenerator
import arcs.core.crdt.testutil.SingleActorVersionMapGenerator
import arcs.core.testutil.ChooseFromList
import arcs.core.testutil.IntInRange
import arcs.core.testutil.MapOf
import arcs.core.testutil.SetOf
import arcs.core.testutil.Value
import arcs.core.testutil.runFuzzTest
import org.junit.Test

class CrdtEntityFuzzTest() {
  /**
   * Test that a randomly generated [CrdtEntity] merged with itself produces an empty [CrdtChange].
   */
  @Test
  fun mergeWithSelf_producesNoChanges() = runFuzzTest {
    val versionMap = SingleActorVersionMapGenerator(
      ChooseFromList(it, listOf("me", "foo", "bar", "fooBar")),
      IntInRange(it, 1, 20)
    )

    val singletons = MapOf(
      ChooseFromList(it, listOf("koala", "kangaroo", "penguin", "emu")),
      ReferencableGenerator(ChooseFromList(it, listOf("animal", "mammal", "reptile", "shelled"))),
      IntInRange(it, 0, 3)
    )

    val collections = MapOf(
      ChooseFromList(it, listOf("koalas", "kangaroos", "penguins", "emus")),
      SetOf(
        ReferencableGenerator(
          ChooseFromList(
            it,
            listOf("animals", "mammals", "reptiles", "shelled", "pets", "birds", "fish")
          )
        ),
        IntInRange(it, 1, 3)
      ),
      IntInRange(it, 0, 4)
    )

    val rawEntity = RawEntityGenerator(
      ChooseFromList(it, listOf("Anne", "Bob", "Charles", "Darwin", "Ed", "Frank", "George")),
      singletons,
      collections,
      Value(100),
      Value(100)
    )

    val entity = CrdtEntityGenerator(
      versionMap,
      rawEntity
    )()

    invariant_mergeWithSelf_producesNoChanges(entity)
  }
}
