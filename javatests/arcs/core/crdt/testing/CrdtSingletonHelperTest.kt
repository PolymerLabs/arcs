package arcs.core.crdt.testing

import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CrdtSingletonHelperTest {
  private lateinit var singleton: CrdtSingleton<ReferencablePrimitive<Int>>

  @Before
  fun setUp() {
    singleton = CrdtSingleton()
  }

  @Test
  fun update_setsValue() {
    val helper = CrdtSingletonHelper(ACTOR, singleton)

    helper.update(INT_111)
    assertThat(singleton.consumerView).isEqualTo(INT_111)

    helper.update(INT_222)
    assertThat(singleton.consumerView).isEqualTo(INT_222)
  }

  @Test
  fun update_incrementsVersionMap() {
    val helper = CrdtSingletonHelper(ACTOR, singleton)

    helper.update(INT_111)
    assertThat(singleton.versionMap).isEqualTo(VersionMap(ACTOR to 1))

    helper.update(INT_222)
    assertThat(singleton.versionMap).isEqualTo(VersionMap(ACTOR to 2))
  }

  @Test
  fun clear_removesValue() {
    val helper = CrdtSingletonHelper(ACTOR, singleton)
    helper.update(INT_111)

    helper.clear()

    assertThat(singleton.consumerView).isNull()
  }

  @Test
  fun clear_doesNotIncrementVersionMap() {
    val helper = CrdtSingletonHelper(ACTOR, singleton)
    helper.update(INT_111)

    helper.clear()

    assertThat(singleton.versionMap).isEqualTo(VersionMap(ACTOR to 1))
  }

  private companion object {
    private const val ACTOR = "ACTOR"
    private val INT_111 = 111.toReferencable()
    private val INT_222 = 222.toReferencable()
  }
}
