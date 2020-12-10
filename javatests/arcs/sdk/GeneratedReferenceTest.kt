package arcs.sdk

import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias Child = ReferenceSpecParticle_SingletonChild
private typealias Parent = ReferenceSpecParticle_Parents

/** Tests the [Reference] generated classes, both as handle types as well as field types. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class GeneratedReferenceTest {
  class ReferenceSpecParticle : AbstractReferenceSpecParticle()

  @get:Rule
  val log = LogRule()

  @get:Rule
  val harness = ReferenceSpecParticleTestHarness { ReferenceSpecParticle() }

  @Before
  fun setUp() = runBlocking {
    harness.start()
  }

  @Test
  fun createReference_singletonHandle() = runBlocking {
    val child = Child(age = 10.0)
    harness.singletonChild.dispatchStore(child)
    val ref = harness.singletonChild.dispatchCreateReference(child)
    assertThat(ref.dereference()).isEqualTo(child)
  }

  @Test
  fun createReference_collectionHandle() = runBlocking {
    val child = Child(age = 10.0)
    harness.collectionChild.dispatchStore(child)
    val ref = harness.collectionChild.dispatchCreateReference(child)
    assertThat(ref.dereference()).isEqualTo(child)
  }

  @Test
  fun storeReference_insideSingletonField() = runBlocking {
    val child = Child(age = 10.0)
    val childRef = createChildReference(child)
    val parent = Parent(age = 40.0, favorite = childRef)

    harness.parents.dispatchStore(parent)
    val parentOut = harness.parents.dispatchFetchAll().single()

    assertThat(parentOut).isEqualTo(parent)
    assertThat(parentOut.favorite).isEqualTo(childRef)
    assertThat(parentOut.favorite!!.dereference()).isEqualTo(child)
  }

  @Test
  fun storeHardReference_insideSingletonField() = runBlocking {
    val child = Child(age = 10.0)
    val childRef = createChildReference(child)
    assertThat(childRef.isHardReference).isFalse()
    val parent = AbstractReferenceSpecParticle.Parent2(age = 40.0, favorite = childRef)
    assertThat(childRef.isHardReference).isTrue()

    harness.parent2.dispatchStore(parent)
    val parentOut = harness.parent2.dispatchFetch()!!
    assertThat(parentOut).isEqualTo(parent)
    val referenceOut = parentOut.favorite!!
    assertThat(referenceOut).isEqualTo(childRef)
    assertThat(referenceOut.isHardReference).isTrue()
    assertThat(referenceOut.dereference()).isEqualTo(child)
  }

  @Test
  fun storeReference_insideCollectionField() = runBlocking {
    val child1 = Child(age = 10.0)
    val child2 = Child(age = 9.0)
    val childRef1 = createChildReference(child1)
    val childRef2 = createChildReference(child2)
    val parent = Parent(age = 40.0, children = setOf(childRef1, childRef2))

    harness.parents.dispatchStore(parent)
    val parentOut = harness.parents.dispatchFetchAll().single()

    assertThat(parentOut).isEqualTo(parent)
    assertThat(parentOut.children).containsExactly(childRef1, childRef2)
    assertThat(parentOut.children.map { it.dereference() }).containsExactly(child1, child2)
    Unit
  }

  @Test
  fun storeReference_insideSingletonReferenceHandle() = runBlocking {
    val child1 = Child(age = 10.0)
    val child2 = Child(age = 9.0)
    val childRef1 = createChildReference(child1)
    val childRef2 = createChildReference(child2)

    // Store a reference in the handle.
    harness.singletonChildRef.dispatchStore(childRef1)
    var childRefOut = harness.singletonChildRef.dispatchFetch()
    assertThat(childRefOut).isEqualTo(childRef1)
    assertThat(childRefOut!!.dereference()).isEqualTo(child1)

    // Store a different reference in the handle.
    harness.singletonChildRef.dispatchStore(childRef2)
    childRefOut = harness.singletonChildRef.dispatchFetch()
    assertThat(childRefOut).isEqualTo(childRef2)
    assertThat(childRefOut!!.dereference()).isEqualTo(child2)
  }

  @Test
  fun storeReference_insideCollectionReferenceHandle() = runBlocking {
    val child1 = Child(age = 10.0)
    val child2 = Child(age = 9.0)
    val childRef1 = createChildReference(child1)
    val childRef2 = createChildReference(child2)

    // Store some references in the handle.
    harness.collectionChildRef.dispatchStore(childRef1)
    var childRefsOut = harness.collectionChildRef.dispatchFetchAll()
    assertThat(childRefsOut).containsExactly(childRef1)
    assertThat(childRefsOut.map { it.dereference() }).containsExactly(child1)

    // Store another reference in the handle.
    harness.collectionChildRef.dispatchStore(childRef2)
    childRefsOut = harness.collectionChildRef.dispatchFetchAll()
    assertThat(childRefsOut).containsExactly(childRef1, childRef2)
    assertThat(childRefsOut.map { it.dereference() }).containsExactly(child1, child2)
    Unit
  }

  /** Creates a [Reference] for the given [Child]. */
  private suspend fun createChildReference(child: Child): Reference<Child> {
    harness.collectionChild.dispatchStore(child)
    return harness.collectionChild.dispatchCreateReference(child)
  }
}
