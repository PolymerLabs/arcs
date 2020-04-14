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
            assertFalse(isBottom)
            assertTrue(isTop)
            assertNull(value)
        }
        with(bottom) {
            assertTrue(isBottom)
            assertFalse(isTop)
            assertNull(value)
        }
        with(ten) {
            assertFalse(isBottom)
            assertFalse(isTop)
            assertThat(value).isEqualTo(10)
        }
    }

    @Test
    fun joinRespectsBottomTopOrder() {
        val joinInts: (Int, Int) -> Int = { a, b -> maxOf(a, b) }
        with(bottom) {
            assertThat(join(bottom, joinInts)).isEqualTo(bottom)
            assertThat(join(top, joinInts)).isEqualTo(top)
            assertThat(join(nine, joinInts)).isEqualTo(nine)
            assertThat(join(ten, joinInts)).isEqualTo(ten)
        }
        with(top) {
            assertThat(join(bottom, joinInts)).isEqualTo(top)
            assertThat(join(top, joinInts)).isEqualTo(top)
            assertThat(join(nine, joinInts)).isEqualTo(top)
            assertThat(join(ten, joinInts)).isEqualTo(top)
        }
        with(nine) {
            assertThat(join(bottom, joinInts)).isEqualTo(nine)
            assertThat(join(top, joinInts)).isEqualTo(top)
            assertThat(join(nine, joinInts)).isEqualTo(nine)
            assertThat(join(ten, joinInts)).isEqualTo(ten)
        }
        with(ten) {
            assertThat(join(bottom, joinInts)).isEqualTo(ten)
            assertThat(join(top, joinInts)).isEqualTo(top)
            assertThat(join(nine, joinInts)).isEqualTo(ten)
            assertThat(join(ten, joinInts)).isEqualTo(ten)
        }
    }

    @Test
    fun meetRespectsBottomTopOrder() {
        val meetInts: (Int, Int) -> Int = { a, b -> minOf(a, b) }
        with(bottom) {
            assertThat(meet(bottom, meetInts)).isEqualTo(bottom)
            assertThat(meet(top, meetInts)).isEqualTo(bottom)
            assertThat(meet(nine, meetInts)).isEqualTo(bottom)
            assertThat(meet(ten, meetInts)).isEqualTo(bottom)
        }
        with(top) {
            assertThat(meet(bottom, meetInts)).isEqualTo(bottom)
            assertThat(meet(top, meetInts)).isEqualTo(top)
            assertThat(meet(nine, meetInts)).isEqualTo(nine)
            assertThat(meet(ten, meetInts)).isEqualTo(ten)
        }
        with(nine) {
            assertThat(meet(bottom, meetInts)).isEqualTo(bottom)
            assertThat(meet(top, meetInts)).isEqualTo(nine)
            assertThat(meet(nine, meetInts)).isEqualTo(nine)
            assertThat(meet(ten, meetInts)).isEqualTo(nine)
        }
        with(ten) {
            assertThat(meet(bottom, meetInts)).isEqualTo(bottom)
            assertThat(meet(top, meetInts)).isEqualTo(ten)
            assertThat(meet(nine, meetInts)).isEqualTo(nine)
            assertThat(meet(ten, meetInts)).isEqualTo(ten)
        }
    }

    @Test
    fun isEquivalentToRespectsBottomTopOrder() {
        val compareInts: (Int, Int) -> Boolean = { a, b -> a == b }
        with(bottom) {
            assertTrue(isEquivalentTo(bottom, compareInts))
            assertFalse(isEquivalentTo(top, compareInts))
            assertFalse(isEquivalentTo(nine, compareInts))
            assertFalse(isEquivalentTo(ten, compareInts))
        }
        with(top) {
            assertFalse(isEquivalentTo(bottom, compareInts))
            assertTrue(isEquivalentTo(top, compareInts))
            assertFalse(isEquivalentTo(nine, compareInts))
            assertFalse(isEquivalentTo(ten, compareInts))
        }
        with(nine) {
            assertFalse(isEquivalentTo(bottom, compareInts))
            assertFalse(isEquivalentTo(top, compareInts))
            assertTrue(isEquivalentTo(nine, compareInts))
            assertFalse(isEquivalentTo(ten, compareInts))
        }
        with(ten) {
            assertFalse(isEquivalentTo(bottom, compareInts))
            assertFalse(isEquivalentTo(top, compareInts))
            assertFalse(isEquivalentTo(nine, compareInts))
            assertTrue(isEquivalentTo(ten, compareInts))
        }
    }

}
