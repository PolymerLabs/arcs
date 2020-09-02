package arcs.core.analysis

import com.google.common.truth.Truth.assertThat
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
    fun factoryMethodsAndPredicatesAreCorrect_top() {
        with(top) {
            assertThat(isBottom).isFalse()
            assertThat(isTop).isTrue()
            assertThat(value).isNull()
        }
    }

    @Test
    fun factoryMethodsAndPredicatesAreCorrect_bottom() {
        with(bottom) {
            assertThat(isBottom).isTrue()
            assertThat(isTop).isFalse()
            assertThat(value).isNull()
        }
    }

    @Test
    fun factoryMethodsAndPredicatesAreCorrect_value() {
        with(ten) {
            assertThat(isBottom).isFalse()
            assertThat(isTop).isFalse()
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
            assertThat(isEquivalentTo(bottom, compareInts)).isTrue()
            assertThat(isEquivalentTo(top, compareInts)).isFalse()
            assertThat(isEquivalentTo(nine, compareInts)).isFalse()
            assertThat(isEquivalentTo(ten, compareInts)).isFalse()
        }
        with(top) {
            assertThat(isEquivalentTo(bottom, compareInts)).isFalse()
            assertThat(isEquivalentTo(top, compareInts)).isTrue()
            assertThat(isEquivalentTo(nine, compareInts)).isFalse()
            assertThat(isEquivalentTo(ten, compareInts)).isFalse()
        }
        with(nine) {
            assertThat(isEquivalentTo(bottom, compareInts)).isFalse()
            assertThat(isEquivalentTo(top, compareInts)).isFalse()
            assertThat(isEquivalentTo(nine, compareInts)).isTrue()
            assertThat(isEquivalentTo(ten, compareInts)).isFalse()
        }
        with(ten) {
            assertThat(isEquivalentTo(bottom, compareInts)).isFalse()
            assertThat(isEquivalentTo(top, compareInts)).isFalse()
            assertThat(isEquivalentTo(nine, compareInts)).isFalse()
            assertThat(isEquivalentTo(ten, compareInts)).isTrue()
        }
    }
}
