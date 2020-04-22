package arcs.sdk.spec

import arcs.core.util.testutil.LogRule
import arcs.sdk.Reference
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

/** Specification tests for [Reference]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ReferenceSpecTest {
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
        harness.singletonChild.store(child)
        val ref = harness.singletonChild.createReference(child)
        assertThat(ref.dereference()).isEqualTo(child)
    }

    @Test
    fun createReference_collectionHandle() = runBlocking {
        val child = Child(age = 10.0)
        harness.collectionChild.store(child)
        val ref = harness.collectionChild.createReference(child)
        assertThat(ref.dereference()).isEqualTo(child)
    }

    @Test
    fun storeReference_insideSingletonField() = runBlocking {
        val child = Child(age = 10.0)
        val childRef = createChildReference(child)
        val parent = Parent(age = 40.0, favorite = childRef)

        harness.parents.store(parent)
        val parentOut = harness.parents.fetchAll().single()

        assertThat(parentOut).isEqualTo(parent)
        assertThat(parentOut.favorite).isEqualTo(childRef)
        assertThat(parentOut.favorite!!.dereference()).isEqualTo(child)
    }

    @Test
    fun storeReference_insideCollectionField() = runBlocking {
        val child1 = Child(age = 10.0)
        val child2 = Child(age = 9.0)
        val childRef1 = createChildReference(child1)
        val childRef2 = createChildReference(child2)
        val parent = Parent(age = 40.0, children = setOf(childRef1, childRef2))

        harness.parents.store(parent)
        val parentOut = harness.parents.fetchAll().single()

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
        harness.singletonChildRef.store(childRef1)
        var childRefOut = harness.singletonChildRef.fetch()
        assertThat(childRefOut).isEqualTo(childRef1)
        assertThat(childRefOut!!.dereference()).isEqualTo(child1)

        // Store a different reference in the handle.
        harness.singletonChildRef.store(childRef2)
        childRefOut = harness.singletonChildRef.fetch()
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
        harness.collectionChildRef.store(childRef1)
        var childRefsOut = harness.collectionChildRef.fetchAll()
        assertThat(childRefsOut).containsExactly(childRef1)
        assertThat(childRefsOut.map { it.dereference() }).containsExactly(child1)

        // Store another reference in the handle.
        harness.collectionChildRef.store(childRef2)
        childRefsOut = harness.collectionChildRef.fetchAll()
        assertThat(childRefsOut).containsExactly(childRef1, childRef2)
        assertThat(childRefsOut.map { it.dereference() }).containsExactly(child1, child2)
        Unit
    }

    /** Creates a [Reference] for the given [Child]. */
    private suspend fun createChildReference(child: Child): Reference<Child> {
        harness.collectionChild.store(child)
        return harness.collectionChild.createReference(child)
    }
}
