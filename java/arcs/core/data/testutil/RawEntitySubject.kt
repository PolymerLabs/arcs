package arcs.core.data.testutil

import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencableList
import com.google.common.truth.Fact
import com.google.common.truth.Fact.fact
import com.google.common.truth.Fact.simpleFact
import com.google.common.truth.FailureMetadata
import com.google.common.truth.Subject
import com.google.common.truth.Truth.assertAbout
import java.lang.Integer.max

/**
 * Custom Truth [Subject] for asserting on [RawEntity] instances.
 *
 * Displays a much nicer diff between unequal entities than the default diff, e.g.:
 *
 *     RawEntity instances are different
 *     for field: rawEntity.collections[foo][1]
 *     expected : Primitive(0.695700200506916)
 *     but was  : Primitive(0.46839655204527963)
 *
 * See [RawEntitySubject.Companion.assertThat] for instructions on how to use this.
 */
class RawEntitySubject private constructor(
  failureMetadata: FailureMetadata,
  subject: RawEntity?
) : Subject(failureMetadata, subject) {
  private val actual: RawEntity? = subject

  override fun isEqualTo(expected: Any?) {
    if (actual == expected) {
      return
    }
    if (expected !is RawEntity || actual == null) {
      // Standard failure scenarios, defer to Truth's standard error message.
      super.isEqualTo(expected)
      return // Redundant return, above line should always throw.
    }

    var diffs = RawEntityDiffer().diff(expected, actual)

    if (diffs.isEmpty()) {
      diffs = listOf(
        simpleFact("<RawEntity instances are not equal, but no differences could be found>"),
        fact("expected", expected.toString()),
        fact("but was", actual.toString())
      )
    }

    failWithoutActual(
      simpleFact("RawEntity instances are different"),
      *diffs.toTypedArray()
    )
  }

  class RawEntityDiffer {
    private val diffs = mutableListOf<Fact>()

    fun diff(expected: RawEntity, actual: RawEntity): List<Fact> {
      diffRawEntity(prefix = "rawEntity", expected, actual)
      return diffs
    }

    private fun diffRawEntity(prefix: String, expected: RawEntity, actual: RawEntity) {
      if (expected == actual) {
        return
      }
      if (actual.id != expected.id) {
        addDiff("$prefix.id", expected.id, actual.id)
      }
      if (actual.creationTimestamp != expected.creationTimestamp) {
        addDiff(
          "$prefix.creationTimestamp",
          expected.creationTimestamp.toString(),
          actual.creationTimestamp.toString()
        )
      }
      if (actual.expirationTimestamp != expected.expirationTimestamp) {
        addDiff(
          "$prefix.expirationTimestamp",
          expected.expirationTimestamp.toString(),
          actual.expirationTimestamp.toString()
        )
      }
      diffMap("$prefix.singletons", expected.singletons, actual.singletons)
      diffMap("$prefix.collections", expected.collections, actual.collections)
    }

    private fun diffMap(prefix: String, expected: Map<String, Any?>, actual: Map<String, Any?>) {
      if (expected == actual) {
        return
      }
      val expectedKeys = expected.keys
      val actualKeys = actual.keys
      for (key in expectedKeys) {
        if (key in actualKeys) {
          // Check values.
          diffValue("$prefix[$key]", expected[key], actual[key])
        } else {
          // Expected key is missing.
          addDiff("$prefix[$key]", expected[key].toString(), "<absent>")
        }
      }
      for (key in actualKeys) {
        if (key !in expectedKeys) {
          // Unexpected key.
          addDiff("$prefix[$key]", "<absent>", actual[key].toString())
        }
      }
    }

    private fun diffValue(prefix: String, expected: Any?, actual: Any?) {
      when {
        expected == actual -> Unit
        expected is RawEntity && actual is RawEntity -> {
          diffRawEntity(prefix, expected, actual)
        }
        expected is List<*> && actual is List<*> -> {
          diffList(prefix, expected, actual)
        }
        expected is Set<*> && actual is Set<*> -> {
          diffSet(prefix, expected, actual)
        }
        expected is ReferencableList<*> && actual is ReferencableList<*> -> {
          diffValue("$prefix.itemType", expected.itemType, actual.itemType)
          diffList(prefix, expected.value, actual.value)
        }
        else -> {
          addDiff(prefix, expected.toString(), actual.toString())
        }
      }
    }

    private fun diffList(prefix: String, expected: List<*>, actual: List<*>) {
      for (i in 0 until max(expected.size, actual.size)) {
        diffValue(
          "$prefix[$i]",
          expected.getOrElse(i) { "<absent>" },
          actual.getOrElse(i) { "<absent>" }
        )
      }
    }

    private fun diffSet(prefix: String, expected: Set<*>, actual: Set<*>) {
      // Convert each set to a stable sorted list, then compare lists.
      diffList(
        prefix,
        expected.sortedBy { it.toString() }.toList(),
        actual.sortedBy { it.toString() }.toList()
      )
    }

    private fun addDiff(field: String, expected: String, actual: String) {
      diffs.add(fact("for field", field))
      diffs.add(fact("expected", expected))
      diffs.add(fact("but was", actual))
    }
  }

  private object Factory : Subject.Factory<RawEntitySubject, RawEntity> {
    override fun createSubject(
      failureMetadata: FailureMetadata,
      actual: RawEntity?
    ): RawEntitySubject {
      return RawEntitySubject(failureMetadata, actual)
    }
  }

  companion object {
    /**
     * Returns a Truth [Subject] that can be used to assert on a [RawEntity].
     *
     * To use this, simply import this method, and then use [assertThat] as usual on any [RawEntity]
     * instance:
     *
     * ```
     * import arcs.core.data.testutil.RawEntitySubject.Companion.assertThat
     *
     * val myEntity = RawEntity(...)
     * assertThat(myEntity).isEqualTo(...)
     * ```
     */
    fun assertThat(actual: RawEntity): RawEntitySubject {
      return assertAbout(Factory).that(actual)
    }

    /**
     * Factory method for creating a [Factory] instance, to be used with methods like
     * `assertWithMessage`.
     *
     * ```kotlin
     * assertWithMessage("blah").about(rawEntities()).that(...)
     * ```
     */
    fun rawEntities(): Subject.Factory<RawEntitySubject, RawEntity> = Factory
  }
}
