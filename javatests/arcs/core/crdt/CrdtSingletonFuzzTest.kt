package arcs.core.crdt

import arcs.core.crdt.testutil.ReferencableGenerator
import arcs.core.crdt.testutil.SingleActorVersionMapGenerator
import arcs.core.testutil.ChooseFromList
import arcs.core.testutil.IntInRange
import arcs.core.testutil.runFuzzTest
import org.junit.Test

class CrdtSingletonFuzzTest() {
  /**
   * Test that a randomly generated [CrdtSingleton] merged with itself produces an empty
   * [CrdtChange].
   */
  @Test
  fun mergeWithSelf_producesNoChanges() = runFuzzTest {
    val versionMap = SingleActorVersionMapGenerator(
      ChooseFromList(it, listOf("me", "foo", "bar", "fooBar")),
      IntInRange(it, 1, 20)
    )

    val data = ReferencableGenerator(
      ChooseFromList(
        it,
        listOf("animals", "mammals", "reptiles", "shelled", "pets", "birds", "fish")
      )
    )

    val entity = arcs.core.crdt.CrdtSingleton(versionMap(), data())

    invariant_mergeWithSelf_producesNoChanges(entity)
  }
}
