package arcs.core.crdt

import arcs.core.testutil.ChooseFromList
import arcs.core.testutil.GetInt
import arcs.core.testutil.MapOf
import arcs.core.testutil.SetOf
import arcs.core.testutil.Value
import arcs.core.testutil.runFuzzTest
import com.google.common.truth.Truth
import org.junit.Test

class CrdtEntityFuzzTest() {
  /**
   * Test that a randomly generated [CrdtEntity] merged with itself produces an empty [CrdtChange].
   */
  @Test
  fun crdtEntity_merge_invariant() = runFuzzTest {
    val versionMap = VersionMapGenerator(
      ChooseFromList(it, listOf("me", "foo", "bar", "fooBar")),
      GetInt(it, 1, 20)
    )

    val singletons = MapOf(
      ChooseFromList(it, listOf("koala", "kangaroo", "penguin", "emu")),
      ReferencableGenerator(ChooseFromList(it, listOf("animal", "mammal", "reptile", "shelled"))),
      GetInt(it, 0, 3)
    )

    val collections = MapOf(
      ChooseFromList(it, listOf("koalas", "kangaroos", "penguins", "emus")),
      SetOf(
        ReferencableGenerator(
          ChooseFromList(
            it,
            listOf("animals, mammals, reptiles", "shelleds", "pets", "birds", "fish")
          )
        ),
        GetInt(it, 1, 3)
      ),
      GetInt(it, 0, 4)
    )

    val rawEntity = RawEntityGenerator(
      ChooseFromList(it, listOf("Anne", "Bob", "Charles", "Darwin", "Ed", "Frank", "George")),
      singletons,
      collections,
      Value(100),
      Value(100)
    )

    val entity1 = CrdtEntityGenerator(
      versionMap,
      rawEntity
    )()

    val changes = entity1.merge(entity1.data)
    Truth.assertThat(changes.modelChange.isEmpty()).isTrue()
    Truth.assertThat(changes.otherChange.isEmpty()).isTrue()
  }
}
