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
}
