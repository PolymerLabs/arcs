package arcs.core.analysis

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


/** Tests for BoundedAbstractValue. */
@RunWith(JUnit4::class)
class AbstractSetTest {

    private val bottom = AbstractSet.getBottom<Int>()
    private val top = AbstractSet.getTop<Int>()
    private val odds = AbstractSet<Int>(setOf(1, 3, 5, 7, 9))
    private val evens = AbstractSet<Int>(setOf(0, 2, 4, 6, 8))
    private val multiplesOfThree = AbstractSet<Int>(setOf(3, 6, 9, 15))
    private val naturals = AbstractSet<Int>(setOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 9))

    @Test
    fun bottomConstruction() {
        assertThat(bottom.isBottom).isTrue()
        assertThat(bottom.isTop).isFalse()
        assertThat(bottom.set).isNull()
    }

    @Test
    fun topConstruction() {
        assertThat(top.isBottom).isFalse()
        assertThat(top.isTop).isTrue()
        assertThat(top.set).isNull()
    }

    @Test
    fun valueConstruction() {
        assertThat(odds.isBottom).isFalse()
        assertThat(odds.isTop).isFalse()
        assertThat(requireNotNull(odds.set)).containsExactly(1, 3, 5, 7, 9)
    }

    @Test
    fun prettyPrint() {
        assertThat("$top").isEqualTo("TOP")
        assertThat("$bottom").isEqualTo("BOTTOM")
        assertThat("$odds").isEqualTo("[1, 3, 5, 7, 9]")
    }

    @Test
    fun isEquivalentTo() {
        with(bottom) {
            assertThat(isEquivalentTo(bottom)).isTrue()
            assertThat(isEquivalentTo(top)).isFalse()
            assertThat(isEquivalentTo(odds)).isFalse()
            assertThat(isEquivalentTo(evens)).isFalse()
        }
        with(top) {
            assertThat(isEquivalentTo(bottom)).isFalse()
            assertThat(isEquivalentTo(top)).isTrue()
            assertThat(isEquivalentTo(odds)).isFalse()
            assertThat(isEquivalentTo(evens)).isFalse()
        }
        with(odds) {
            assertThat(isEquivalentTo(bottom)).isFalse()
            assertThat(isEquivalentTo(top)).isFalse()
            assertThat(isEquivalentTo(odds)).isTrue()
            assertThat(isEquivalentTo(evens)).isFalse()
        }
    }

    @Test
    fun meet() {
        // bottom |`| something
        assertThat(bottom meet bottom).isEqualTo(bottom)
        assertThat(bottom meet top).isEqualTo(bottom)
        assertThat(bottom meet odds).isEqualTo(bottom)
        assertThat(bottom meet evens).isEqualTo(bottom)
        // top |`| something
        assertThat(top meet bottom).isEqualTo(bottom)
        assertThat(top meet top).isEqualTo(top)
        assertThat(top meet odds).isEqualTo(odds)
        assertThat(top meet evens).isEqualTo(evens)
        // odds |`| something
        assertThat(odds meet bottom).isEqualTo(bottom)
        assertThat(odds meet top).isEqualTo(odds)
        assertThat(odds meet odds).isEqualTo(odds)
        assertThat(odds meet evens).isEqualTo(AbstractSet<Int>(emptySet()))
        assertThat(odds meet multiplesOfThree).isEqualTo(AbstractSet<Int>(setOf(3, 9)))
    }

    @Test
    fun join() {
        // bottom |_| something
        assertThat(bottom join bottom).isEqualTo(bottom)
        assertThat(bottom join top).isEqualTo(top)
        assertThat(bottom join odds).isEqualTo(odds)
        assertThat(bottom join evens).isEqualTo(evens)
        // top |_| something
        assertThat(top join bottom).isEqualTo(top)
        assertThat(top join top).isEqualTo(top)
        assertThat(top join odds).isEqualTo(top)
        assertThat(top join evens).isEqualTo(top)
        // odds |_| something
        assertThat(odds join bottom).isEqualTo(odds)
        assertThat(odds join top).isEqualTo(top)
        assertThat(odds join odds).isEqualTo(odds)
        assertThat(odds join evens).isEqualTo(naturals)
        assertThat(odds join multiplesOfThree)
            .isEqualTo(AbstractSet<Int>(setOf(1, 3, 5, 6, 7, 9, 15)))
    }
}
