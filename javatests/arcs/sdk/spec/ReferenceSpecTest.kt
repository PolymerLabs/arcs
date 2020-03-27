package arcs.sdk.spec

import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.Reference
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
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
    val harness = ReferenceSpecParticleTestHarness { ReferenceSpecParticle() }

    @Before
    fun setUp() = runBlockingTest {
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
    fun storeReference_insideSingletonReferenceHandle() {
        // TODO(csilvestrini): Implement me.
    }

    @Test
    fun storeReference_insideCollectionReferenceHandle() {
        // TODO(csilvestrini): Implement me.
    }

    /** Creates a [Reference] for the given [Child]. */
    private suspend fun createChildReference(child: Child): Reference<Child> {
        harness.collectionChild.store(child)
        return harness.collectionChild.createReference(child)
    }
}
