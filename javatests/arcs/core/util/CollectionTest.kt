package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CollectionTest {
    private val m1 = mapOf("A" to 1, "B" to 2, "C" to 3)
    private val m2 = mapOf("A" to 4, "B" to 5,  "D" to 6)

    @Test
    fun mergeMapValuesInBothMaps() {
        val m1andm2Values = m1.mergeWith(m2) { _, v1, v2 ->
            when {
                v1 != null && v2 != null -> v1 + v2
                else -> null
            }
        }
        assertThat(m1andm2Values).isEqualTo(mapOf("A" to 5, "B" to 7))
    }

    @Test
    fun mergeWithValuesInFirstMap() {
        val m1Values = m1.mergeWith(m2) { _, v1, v2 ->
            when {
                v1 != null && v2 == null -> v1
                else -> null
            }
        }
        assertThat(m1Values).isEqualTo(mapOf("C" to 3))
    }

    @Test
    fun mergeWithValuesInSecondMap() {
        val m2Values = m1.mergeWith(m2) { _, v1, v2 ->
            when {
                v1 == null && v2 != null -> v2
                else -> null
            }
        }
        assertThat(m2Values).isEqualTo(mapOf("D" to 6))
    }

    @Test
    fun mergeWithValuesInEitherMap() {
        val m1orm2Values = m1.mergeWith(m2) { _, v1, v2 ->
            when {
                v1 != null && v2 != null -> v1 + v2
                v1 != null -> v1
                v2 != null -> v2
                else -> null
            }
        }
        assertThat(m1orm2Values).isEqualTo(
            mapOf("A" to 5, "B" to 7, "C" to 3, "D" to 6)
        )
    }

    @Test
    fun mergeWithValuesWithKeyFilter() {
        val onlyAorDValues = m1.mergeWith(m2) { k, v1, v2 ->
            when {
                k != "A" && k != "D" -> null
                v1 != null && v2 != null -> v1 + v2
                v1 != null -> v1
                v2 != null -> v2
                else -> null
            }
        }
        assertThat(onlyAorDValues).isEqualTo(mapOf("A" to 5, "D" to 6))
    }
}
