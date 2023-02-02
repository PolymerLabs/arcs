package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CollectionTest {
  @Test
  fun computeNotNull_keyMissing_receivesExistingValue() {
    val map = mutableMapOf<String, String>()

    val result = map.computeNotNull("abc") { k, v ->
      assertThat(k).isEqualTo("abc")
      assertThat(v).isNull()
      "new_value"
    }

    assertThat(result).isEqualTo("new_value")
    assertThat(map).containsExactly("abc", "new_value")
  }

  @Test
  fun computeNotNull_keyPresent_receivesExistingValue() {
    val map = mutableMapOf<String, String>()
    map["abc"] = "original_value"

    val result = map.computeNotNull("abc") { k, v ->
      assertThat(k).isEqualTo("abc")
      assertThat(v).isEqualTo("original_value")
      "new_value"
    }

    assertThat(result).isEqualTo("new_value")
    assertThat(map).containsExactly("abc", "new_value")
  }
}
