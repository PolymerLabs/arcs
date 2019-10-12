package arcs.crdt

import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CrdtCountTest {
  lateinit var alice: CrdtCount
  lateinit var bob: CrdtCount

  @Before
  fun setup() {
    alice = CrdtCount()
    bob = CrdtCount()
  }

  @Test
  fun count_initializes_to_zero() {
    assertThat(alice.consumerView).isEqualTo(0)
  }

  @Test
  fun can_apply_an_increment_op() {
    assertTrue(alice.applyOperation(CrdtCount.Operation.Increment("alice", 0 to 1)))
    assertThat(alice.consumerView).isEqualTo(1)
  }

  @Test
  fun can_apply_an_increment_op_with_plusEquals() {
    alice.forActor("alice") += 5
    assertThat(alice.consumerView).isEqualTo(5)
  }

  @Test
  fun can_apply_two_increment_ops_from_different_actors() {
    assertTrue(alice.applyOperation(CrdtCount.Operation.Increment("alice", 0 to 1)))
    assertTrue(alice.applyOperation(CrdtCount.Operation.Increment("bob", 0 to 1)))
    assertThat(alice.consumerView).isEqualTo(2)
  }

  @Test
  fun can_apply_two_increment_ops_from_same_actor() {
    assertTrue(alice.applyOperation(CrdtCount.Operation.Increment("alice", 0 to 1)))
    assertTrue(alice.applyOperation(CrdtCount.Operation.Increment("alice", 1 to 2)))
    assertThat(alice.consumerView).isEqualTo(2)
  }

  @Test
  fun can_not_apply_two_increment_ops_from_same_actor_with_same_versions() {
    assertTrue(alice.applyOperation(CrdtCount.Operation.Increment("alice", 0 to 1)))
    assertFalse(alice.applyOperation(CrdtCount.Operation.Increment("alice", 0 to 1)))
    assertThat(alice.consumerView).isEqualTo(1)
  }

  @Test
  fun can_apply_a_multiincrement_op() {
    assertTrue(
      alice.applyOperation(
        CrdtCount.Operation.MultiIncrement("alice", 0 to 1, 10)
      )
    )
    assertThat(alice.consumerView).isEqualTo(10)
  }

  @Test
  fun merges_two_counts_with_increments_from_different_actors() {
    alice.forActor("alice") += 7
    bob.forActor("bob") += 13

    // merge bob into alice
    val results = alice.merge(bob.data)

    assertThat(alice.consumerView).isEqualTo(20)

    assertThat(results.modelChange).isInstanceOf(CrdtChange.Operations::class.java)
    assertThat((results.modelChange as CrdtChange.Operations)[0])
      .isEqualTo(CrdtCount.Operation.MultiIncrement("bob", 0 to 1, 13))

    assertThat(results.otherChange).isInstanceOf(CrdtChange.Operations::class.java)
    assertThat((results.otherChange as CrdtChange.Operations)[0])
      .isEqualTo(CrdtCount.Operation.MultiIncrement("alice", 0 to 1, 7))

    bob.applyChanges(results.otherChange)
    assertThat(bob.consumerView).isEqualTo(20)
  }
}
