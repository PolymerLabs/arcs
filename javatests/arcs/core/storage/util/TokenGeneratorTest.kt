package arcs.core.storage.util

import com.google.common.truth.Truth.assertThat
import kotlin.random.Random
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TokenGeneratorTest {
  @Test
  fun randomTokenGenerator_invokedWithExistingSetOfTokens_returnsNewUniqueValue() {
    val random = FakeRandom()
    val tokenGenerator = RandomTokenGenerator(
      "test",
      random
    )

    val used = setOf(
      "0::test".hashCode(),
      "1::test".hashCode(),
      "2::test".hashCode()
    )
    val expected = "3::test".hashCode()
    val actual = tokenGenerator(used)
    assertThat(actual).isEqualTo(expected)
  }

  private open class FakeRandom : Random() {
    var nextIntValue: Int = 0
    override fun nextBits(bitCount: Int): Int = nextIntValue++
    override fun nextInt(): Int = nextIntValue++
  }
}
