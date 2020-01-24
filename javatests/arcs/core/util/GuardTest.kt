package arcs.core.util

import arcs.core.testutil.assertThrows
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for the [guardWith]-generated property delegate: [GuardDelegate]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class GuardTest {
    class RequiresLocking(initialValue: Int = 0) {
        val mutex = Mutex()
        var value by guardWith(mutex) { initialValue }
    }

    class LazyTestClass(initialValue: () -> Int) {
        val mutex = Mutex()
        var value: Int by guardWith(mutex, initialValue)
    }

    @Test
    fun initialValueLambda_isTreatedAsALazy_function() = runBlockingTest {
        var called = false
        val initializer = {
            called = true
            1
        }
        val obj = LazyTestClass(initializer)

        assertThat(called).isFalse()

        obj.mutex.withLock {
            assertThat(obj.value).isEqualTo(1)
        }
        assertThat(called).isTrue()

        called = false
        obj.mutex.withLock {
            assertThat(obj.value).isEqualTo(1)
        }
        assertThat(called).isFalse()
    }

    @Test
    fun lazyInitializer_neverCalled_ifSetHappensFirst() = runBlockingTest {
        var called = false
        val initializer = {
            called = true
            1
        }
        val obj = LazyTestClass(initializer)

        assertThat(called).isFalse()
        obj.mutex.withLock {
            obj.value = 2
            assertThat(obj.value).isEqualTo(2)
        }
        assertThat(called).isFalse()
    }

    @Test
    fun accessingGuardedValue_outsideOfLock_throws() {
        val obj = RequiresLocking()

        assertThrows(IllegalStateException::class) { println(obj.value) }
    }

    @Test
    fun accessingGuardedValue_insideLock_succeeds() = runBlockingTest {
        val obj = RequiresLocking(100)

        obj.mutex.withLock {
            assertThat(obj.value).isEqualTo(100)
        }
    }

    @Test
    fun mutatingGuardedValue_outsideOfLock_throws() {
        val obj = RequiresLocking()

        assertThrows(IllegalStateException::class) { obj.value = 25 }
    }

    @Test
    fun mutatingGuardedValue_insideLock_succeeds() = runBlockingTest {
        val obj = RequiresLocking()

        obj.mutex.withLock {
            obj.value = 25
            assertThat(obj.value).isEqualTo(25)
        }
    }
}
