package arcs.core.crdt.testing

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CrdtSetHelperTest {
  private lateinit var set: CrdtSet<ReferencablePrimitive<Int>>

  @Before
  fun setUp() {
    set = CrdtSet()
  }

  @Test
  fun add_addsElement() {
    val helper = CrdtSetHelper(ACTOR, set)

    helper.add(INT_111)
    assertThat(set.consumerView).containsExactly(INT_111)

    helper.add(INT_222)
    assertThat(set.consumerView).containsExactly(INT_111, INT_222)
  }

  @Test
  fun add_incrementsVersionMap() {
    val helper = CrdtSetHelper(ACTOR, set)

    helper.add(INT_111)
    assertThat(set.versionMap).isEqualTo(VersionMap(ACTOR to 1))

    helper.add(INT_222)
    assertThat(set.versionMap).isEqualTo(VersionMap(ACTOR to 2))
  }

  @Test
  fun remove_removesElement() {
    val helper = CrdtSetHelper(ACTOR, set)
    helper.add(INT_111)
    helper.add(INT_222)

    helper.remove(INT_222.id)

    assertThat(set.consumerView).containsExactly(INT_111)
  }

  @Test
  fun remove_doesNotIncrementVersionMap() {
    val helper = CrdtSetHelper(ACTOR, set)
    helper.add(INT_111)

    helper.remove(INT_111.id)

    assertThat(set.versionMap).isEqualTo(VersionMap(ACTOR to 1))
  }

  @Test
  fun clear_removesAllElements() {
    val helper = CrdtSetHelper(ACTOR, set)
    helper.add(INT_111)
    helper.add(INT_222)

    helper.clear()

    assertThat(set.consumerView).isEmpty()
  }

  @Test
  fun clear_doesNotIncrementVersionMap() {
    val helper = CrdtSetHelper(ACTOR, set)
    helper.add(INT_111)

    helper.clear()

    assertThat(set.versionMap).isEqualTo(VersionMap(ACTOR to 1))
  }

  private companion object {
    private const val ACTOR = "ACTOR"
    private val INT_111 = 111.toReferencable()
    private val INT_222 = 222.toReferencable()
  }
}
