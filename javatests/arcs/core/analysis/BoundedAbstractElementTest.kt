package arcs.core.analysis

import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


/** Tests for BoundedAbstractValue. */
@RunWith(JUnit4::class)
class BoundedAbstractElementTest {
    private val top = BoundedAbstractElement.getTop<Int>()
    private val bottom = BoundedAbstractElement.getBottom<Int>()
    private val nine = BoundedAbstractElement.makeValue<Int>(9)
    private val ten = BoundedAbstractElement.makeValue<Int>(10)

    @Test
    fun factoryMethodsAndPredicatesAreCorrect() {
        with(top) {
            assertFalse(isBottom())
            assertTrue(isTop())
            assertNull(value())
        }
        with(bottom) {
            assertTrue(isBottom())
            assertFalse(isTop())
            assertNull(value())
        }
        with(ten) {
            assertFalse(isBottom())
            assertFalse(isTop())
            assertThat(value()).isEqualTo(10)
        }
    }

    @Test
    fun isLessThanEqualRespectsBottomTopOrder() {
        val compareInts: (Int, Int) -> Boolean = { a, b -> a <= b }
        with(bottom) {
            assertTrue(isLessThanEqual(bottom, compareInts))
            assertTrue(isLessThanEqual(top, compareInts))
            assertTrue(isLessThanEqual(nine, compareInts))
            assertTrue(isLessThanEqual(ten, compareInts))
        }
        with(top) {
            assertFalse(isLessThanEqual(bottom, compareInts))
            assertTrue(isLessThanEqual(top, compareInts))
            assertFalse(isLessThanEqual(nine, compareInts))
            assertFalse(isLessThanEqual(ten, compareInts))
        }
        with(nine) {
            assertFalse(isLessThanEqual(bottom, compareInts))
            assertTrue(isLessThanEqual(top, compareInts))
            assertTrue(isLessThanEqual(nine, compareInts))
            assertTrue(isLessThanEqual(ten, compareInts))
        }
        with(ten) {
            assertFalse(isLessThanEqual(bottom, compareInts))
            assertTrue(isLessThanEqual(top, compareInts))
            assertFalse(isLessThanEqual(nine, compareInts))
            assertTrue(isLessThanEqual(ten, compareInts))
        }
    }
}
