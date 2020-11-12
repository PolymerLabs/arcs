package arcs.core.storage.util

import kotlin.random.Random

typealias TokenGenerator = (currentlyUsedTokens: Set<Int>) -> Int

/**
 * A [TokenGenerator] instance that will provide a new, unique random token each time it is called.
 *
 * @param baseData a salt of sorts, used to help in making callback IDs more unique across hosts.
 * @param random source of randomness to use when generating callback IDs.
 */
class RandomTokenGenerator(
  private val baseData: String,
  private val random: Random
) : TokenGenerator {
  override fun invoke(currentlyUsedTokens: Set<Int>): Int {
    var unique = random.nextInt()
    var tokenString = "$unique::$baseData"

    while (tokenString.hashCode() in currentlyUsedTokens) {
      unique = random.nextInt()
      tokenString = "$unique::$baseData"
    }

    return tokenString.hashCode()
  }
}
