package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.*
import arcs.core.crdt.CrdtSingleton.Operation.Update
import arcs.core.crdt.internal.VersionMap
import arcs.core.storage.Handle.Direction.*
import arcs.core.storage.Handle.HandleNotReadableException
import arcs.core.storage.Handle.HandleNotWriteableException
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assert_
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Suite


class Mocks {

    data class Value(override val id: ReferenceId, val data: String = "") : Referencable

    companion object {
        fun values(vararg ids: String): Set<Value> {
            return ids.map { Value(it) }.toSet()
        }
    }

    class StorageProxy<Data : CrdtData, Operation : CrdtOperation, T>(val crdt: CrdtModel<Data, Operation, T>) : arcs.core.storage.StorageProxy<Data, Operation, T> {
        val versionMap = VersionMap()
        override fun getParticleView(): ValueAndVersion<T> = ValueAndVersion(crdt.consumerView, versionMap)

        override fun applyOp(op: Operation): Boolean {
            crdt.applyOperation(op)
            return true
        }
    }

    class Particle : arcs.core.storage.Particle {
        var onSyncCalled = false
        var onDesyncCalled = false
        var onHandleUpdateCalled = false
        override fun onHandleSync(handle: Handle<*, *, *>) {
            onSyncCalled = true
        }

        override fun onHandleDesync(handle: Handle<*, *, *>) {
            onDesyncCalled = true
        }

        override fun onHandleUpdate(handle: Handle<*, *, *>) {
            onHandleUpdateCalled = true
        }
    }
}
class CollectionHandleTest {

    fun <T : Referencable> newCollectionHandle(direction: Handle.Direction, particle: Particle = Mocks.Particle()): Collection<T> {
        val model = CrdtSet<T>()
        val sp = Mocks.StorageProxy(model)
        return Collection<T>(
            "test",
            sp,
            particle,
            direction,
            "noname"
        )
    }

    @Test
    fun testAddAndRemoveElements() {
        val handle = newCollectionHandle<Mocks.Value>(InOut)
        handle.add(Mocks.Value("a"))
        assertThat(handle.toSet()).containsExactlyElementsIn(Mocks.values("a"))
        handle.add(Mocks.Value("b"))
        assertThat(handle.toSet()).containsExactlyElementsIn(Mocks.values("a", "b"))
        handle.remove(Mocks.Value("a"))
        assertThat(handle.toSet()).containsExactlyElementsIn(Mocks.values("b"))
    }

    @Test
    fun respectsCanWrite() {
        val handle = newCollectionHandle<Mocks.Value>(In)
        try {
            handle.add(Mocks.Value("a"))
            assert_().withMessage("non-writable handle should not allow add").fail()
        } catch (e: HandleNotWriteableException) {
            //success
        }
        try {
            handle.remove(Mocks.Value("a"))
            assert_().withMessage("non-writable handle should not allow remove").fail()
        } catch (e: HandleNotWriteableException) {
            //success
        }
        try {
            handle.clear()
            assert_().withMessage("non-writable handle should not allow clear").fail()
        } catch (e: HandleNotWriteableException) {
            //success
        }
    }

    @Test
    fun respectsCanRead() {
        val handle = newCollectionHandle<Mocks.Value>(Out)
        try {
            handle.get("a")
            assert_().withMessage("non-readable handle should not allow get").fail()
        } catch (e: HandleNotReadableException) {
            // success
        }

        try {
            handle.toSet()
            assert_().withMessage("non-readable handle should not allow toSet").fail()
        } catch (e: HandleNotReadableException) {
            // success
        }
    }

    @Test
    fun getElementByID() {
        val handle = newCollectionHandle<Mocks.Value>(InOut)
        val entityA = Mocks.Value("a", "something")
        val entityB = Mocks.Value("b", "somethingelse")
        handle.add(entityA)
        handle.add(entityB)
        assertThat(handle.get("a")).isEqualTo(entityA)
        assertThat(handle.get("b")).isEqualTo(entityB)
    }

    @Test // support this at all?
    fun assignIDWhenMissing() {
    }

    @Test
    fun clearElements() {
        val handle = newCollectionHandle<Mocks.Value>(InOut)
        handle.add(Mocks.Value("a"))
        handle.add(Mocks.Value("b"))
        handle.clear()
        assertThat(handle.toSet()).isEmpty()
    }

    @Test
    fun addMultipleEntities() {
        val handle = newCollectionHandle<Mocks.Value>(InOut)
        handle.add(Mocks.Value("a"), Mocks.Value("b"))
        assertThat(handle.toSet()).containsExactlyElementsIn(Mocks.values("a", "b"))
        handle.add(listOf(Mocks.Value("c"), Mocks.Value("d"), Mocks.Value("e")))
        assertThat(handle.toSet()).containsExactlyElementsIn(Mocks.values("a", "b", "c", "d", "e"))
    }

    @Test
    fun notifySync() {
        val particle = Mocks.Particle()
        val handle = newCollectionHandle<Mocks.Value>(InOut, particle)
        handle.onSync()
        assertThat(particle.onSyncCalled).isTrue()
    }

    @Test
    fun notifyDesync() {
        val particle = Mocks.Particle()
        val handle = newCollectionHandle<Mocks.Value>(InOut, particle)
        handle.onDesync()
        assertThat(particle.onDesyncCalled).isTrue()
    }

    @Test
    fun notifyUpdate() {
       // TODO
    }

    @Test
    fun notifyFastForwardUpdate() {
        // TODO
    }

    @Test
    fun storesNewVersionMap() {
       // TODO
    }

    @Test
    fun overrideDefaultOptions() {
        // TODO
    }
}

class SingletonHandleTest {

    fun <T : Referencable> newSingletonHandle(direction: Handle.Direction, particle: Particle = Mocks.Particle()): Singleton<T> {
        val model: CrdtModel<CrdtSingleton.Data<T>, CrdtSingleton.IOperation<T>,T?> = CrdtSingleton()
        val sp = Mocks.StorageProxy(model)

        return Singleton(
            "test",
            sp,
            particle,
            direction,
            "noname"
        )
    }

    @Test
    fun setAndClearElements() {
        val handle = newSingletonHandle<Mocks.Value>(InOut)
        assertThat(handle.get()).isEqualTo(null);
        handle.set(Mocks.Value("A"))
        assertThat(handle.get()).isEqualTo(Mocks.Value("A"))
        handle.set(Mocks.Value("B"))
        assertThat(handle.get()).isEqualTo(Mocks.Value("B"))
        handle.clear()
        assertThat(handle.get()).isEqualTo(null)
    }

    @Test
    fun notifyParticleOnSync() {
        val particle = Mocks.Particle()
        val handle = newSingletonHandle<Mocks.Value>(InOut, particle)
        handle.onSync()
        assertThat(particle.onSyncCalled).isTrue()
    }

    @Test
    fun notifyParticleOnDesync() {
        val particle = Mocks.Particle()
        val handle = newSingletonHandle<Mocks.Value>(InOut, particle)
        handle.onDesync()
        assertThat(particle.onDesyncCalled).isTrue()
    }

    @Test
    // TODO
    fun notifyParticleOfUpdates() {
        val particle = Mocks.Particle()
        val handle = newSingletonHandle<Mocks.Value>(InOut, particle)
        val version = VersionMap()
        val value = Mocks.Value("foo")
        handle.onUpdate(Update("actor", version, value), version)
        // TODO
        // assertThat(particle.lastUpdate).isEqualTo(updateToExpect)
        // assertThat(particle.lastUpdate.data).isEqualToo("foo")
    }

    @Test
    // TODO
    fun storeNewVersionMap() {
        // TODO - have mock storage proxy return above version map
        // Call get to pull in pre-specified version map
        // Mock apply op to check that the update clock is passed in the next operation
        // assert captured clock is equal to original clock after non-update operation(clear)
    }

    @Test
    fun respectCanWrite() {
        val handle = newSingletonHandle<Mocks.Value>(In)
        try {
            handle.set(Mocks.Value("dontdoit"))
            assert_().withMessage("should not have set").fail()
        } catch (e: HandleNotWriteableException) {
            // success
        }

        try {
            handle.clear()
            assert_().withMessage("should not have cleared").fail()
        } catch (e: HandleNotWriteableException) {
            // success
        }
    }

    @Test
    fun respectCanRead() {
        val handle = newSingletonHandle<Mocks.Value>(Out)
        try {
            handle.get()
            assert_().withMessage("should not have gotten").fail()
        } catch (e: HandleNotReadableException) {
            // success
        }
    }
}

@RunWith(Suite::class)
@Suite.SuiteClasses(SingletonHandleTest::class, CollectionHandleTest::class)
class HandleTest

