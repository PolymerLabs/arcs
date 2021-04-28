/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.testutil

/**
 * Asserts that a list of values matches a given structure of sequences and groups.
 *
 * Sequences indicate a causal ordering between values. They do not require that the values
 * follow each other immmediately. Parallel sequences are evaluated independently, so they may
 * be interleaved with each other (and other unrelated values) in the [actual] list:
 *
 *   actual: A1, B1, B2, x, C1, A2, y, C2     // unmatched values in lower case for clarity
 *
 *   sequence(A1, A2)       }
 *   sequence(B1, B2)       } all three sequences will be satisfied
 *   sequence(C1, C2)       }
 *
 * Groups match the given values in any order, also without requiring adjacency. Parallel groups
 * may be interleaved in the same way as sequences:
 *
 *   actual: A, B, c, D, E, F, g, H, I, J, K
 *
 *   group(F, B, D, H)      }
 *   group(E, I)            } all three groups will be satisfied
 *   group(J, K, A)         }
 *
 * Both structures may be arbitrarily nested. Nesting under a sequence indicates causal ordering
 * of the contained constraints. Nesting under a group simply groups the contained constraints
 * again; this is primarily useful for further sequencing.
 *
 *   actual: g, X, f, Y, p, S, R, z, Q, B1, A1, A2, m, B2, w, K, J
 *
 *   sequence(
 *     sequence(X, Y),       // X->Y must occur first
 *     group(Q, R, S),       // followed by Q, R and S in any order
 *     group(                // then A1->A2 and B1->B2, which may be interleaved
 *       sequence(A1, A2),
 *       sequence(B1, B2)
 *     ),
 *     group(J, K),          // finally J and K must be after both A2 and B2
 *   )
 *
 * If more than one item is provided in [constraints] they are implicitly considered a sequence.
 * If parallel evaluation is required, wrap the list in an outer group.
 *
 * By default, all values in [actual] must be matched by a constraint. This can be relaxed by
 * setting [allowUnmatched] to true.
 *
 * [Constraint] objects can be reused, within and across invocations of assertVariableOrdering.
 */
fun <T> assertVariableOrdering(
  actual: List<T>,
  vararg constraints: Constraint<T>,
  allowUnmatched: Boolean = false
) {
  // Run top-level constraints in sequence; fail immediately if any do not succeed.
  val topLevel = if (constraints.size == 1) {
    constraints[0]
  } else {
    Constraint.NestSequence(constraints.toList())
  }

  val report = topLevel.process(ResultList(actual.map { Result<T>(it) }))
  if (report !is Report.Success) {
    throw report.toException()
  }

  // Unless otherwise directed, fail when any values were not matched by at least one constraint.
  if (!allowUnmatched) {
    val unmatched = Report.checkUnmatched(report.matches)
    if (unmatched !is Report.Success) {
      throw unmatched.toException()
    }
  }
}

/** Helpers for constructing value/nested sequences/groups. */
fun <T> single(value: T) = Constraint.SingleValue(value)

fun <T> sequence(vararg values: T) = Constraint.ValueSequence(values.toList())

fun <T> sequence(values: Iterable<T>) = Constraint.ValueSequence(values.toList())

fun <T> sequence(vararg constraints: Constraint<T>) = Constraint.NestSequence(constraints.toList())

fun <T> sequence(constraints: Iterable<Constraint<T>>) =
  Constraint.NestSequence(constraints.toList())

fun <T> group(vararg values: T) = Constraint.ValueGroup(values.toList())

fun <T> group(values: Iterable<T>) = Constraint.ValueGroup(values.toList())

fun <T> group(vararg constraints: Constraint<T>) = Constraint.NestGroup(constraints.toList())

fun <T> group(constraints: Iterable<Constraint<T>>) = Constraint.NestGroup(constraints.toList())

/** Holds the overall results of a call to [assertVariableOrdering]. */
class ResultList<T>(private val items: List<Result<T>>) : List<Result<T>> by items {
  fun deepCopy() = ResultList(items.map { it.copy() })
}

/** Holds the result of a [Constraint] match against a single value. */
data class Result<T>(
  val value: T,
  /** The constraint that matched or failed on [value]. */
  var constraint: Constraint<T>? = null,
  /** Index of [value] in [constraint]. */
  var constraintIndex: Int = -1,
  /** Index in the 'actual' list at which [value] was matched or failed to match. */
  var actualIndex: Int = -1
) {
  fun showIndexed() = constraint?.showIndexed(constraintIndex) ?: ""
}

/** Represents a sequence or group constraint for value type [T]. */
sealed class Constraint<T> {

  /** The highest index in the input list successfully matched by this constraint. */
  var maxIndex = -1

  /**
   * A set of the values held by this constraint. For nested constraints, this is the combined set
   * of all the contained value constraints. Used to reduce processing for [NestGroup] permutations.
   */
  abstract val valueSet: Set<T>

  /**
   * Evaluates this constraint against the input list provided to [assertVariableOrdering], starting
   * at the [from] index. Returns null on success or a [Report] containing details of the match
   * failure.
   *
   * If [failFast] is true, constraints will return an empty error report as soon as a failure is
   * encountered (instead of attempting to match as much as possible of a failed constraint).
   * This is used to reduce processing for [NestGroup] permutations.
   */
  abstract fun process(matches: ResultList<T>, from: Int = 0, failFast: Boolean = false): Report<T>

  /**
   * For value-based constraints, shows the list of expected values with a specific one
   * highlighted: `seq(a, b, >c<, d)`. Unused for nested constraints.
   */
  open fun showIndexed(i: Int): String = ""

  /** Represents a causally-ordered sequence of values. */
  open class ValueSequence<T>(val values: List<T>) : Constraint<T>() {
    open val label: String = "sequence"

    override val valueSet by lazy { values.toSet() }

    override fun process(matches: ResultList<T>, from: Int, failFast: Boolean): Report<T> {
      val newMatches = matches.deepCopy()
      var varFrom = from
      val unmatched = mutableListOf<Result<T>>()
      values.forEachIndexed { ci, value ->
        val ai = search(newMatches, value, varFrom)
        if (ai != -1) {
          newMatches[ai].let {
            it.constraint = this
            it.constraintIndex = ci
            it.actualIndex = ai
          }
          varFrom = ai + 1
          maxIndex = ai
        } else if (failFast) {
          return Report.FastFailure()
        } else {
          unmatched.add(Result(value, this, ci, varFrom))
        }
      }
      return if (unmatched.isEmpty()) {
        Report.Success(newMatches)
      } else {
        Report.MatchFailure(label, newMatches, unmatched)
      }
    }

    override fun showIndexed(i: Int) = "seq(${showIndexed(values, i)})"

    override fun toString() = "seq(${values.joinToString(", ")})"
  }

  /** Single values are just a sequence of 1, but display failures with better labels. */
  class SingleValue<T>(value: T) : ValueSequence<T>(listOf(value)) {
    override val label = "single"

    override val valueSet = setOf(value)

    override fun showIndexed(i: Int) = "sng(${values.first()})"
  }

  /** Represents an unordered group of values. */
  class ValueGroup<T>(val values: List<T>) : Constraint<T>() {

    override val valueSet by lazy { values.toSet() }

    override fun process(matches: ResultList<T>, from: Int, failFast: Boolean): Report<T> {
      val newMatches = matches.deepCopy()
      val unmatched = mutableListOf<Result<T>>()
      maxIndex = -1
      values.forEachIndexed { ci, value ->
        val ai = search(newMatches, value, from)
        if (ai != -1) {
          newMatches[ai].let {
            it.constraint = this
            it.constraintIndex = ci
            it.actualIndex = ai
          }
          maxIndex = Math.max(ai, maxIndex)
        } else if (failFast) {
          return Report.FastFailure()
        } else {
          unmatched.add(Result(value, this, ci, 0))
        }
      }
      return if (unmatched.isEmpty()) {
        Report.Success(newMatches)
      } else {
        unmatched.forEach { it.actualIndex = Math.max(maxIndex + 1, from) }
        Report.MatchFailure("group", newMatches, unmatched)
      }
    }

    override fun showIndexed(i: Int) = "grp(${showIndexed(values, i)})"

    override fun toString() = "grp(${values.joinToString(", ")})"
  }

  /** Represents a causally-ordered sequence of constraints. */
  class NestSequence<T>(val constraints: List<Constraint<T>>) : Constraint<T>() {

    override val valueSet by lazy {
      mutableSetOf<T>().also { s -> constraints.forEach { s.addAll(it.valueSet) } }
    }

    override fun process(matches: ResultList<T>, from: Int, failFast: Boolean): Report<T> {
      var varMatches = matches
      var varFrom = from
      for (c in constraints) {
        val report = c.process(varMatches, varFrom, failFast)
        if (report !is Report.Success) {
          return report
        }
        varMatches = report.matches
        varFrom = c.maxIndex + 1
        maxIndex = c.maxIndex
      }
      return Report.Success(varMatches)
    }

    override fun toString() = "seq(${constraints.joinToString(", ")})"
  }

  /**
   * Represents an unordered group of constraints.
   *
   * Processing a nested group is a bit complicated. It's possible that the given order of
   * constraints will fail against the input, but a different order will work. For example, an
   * input of [A,X,A,Y] against grp(seq(A,Y), seq(A,X)) will match the first A and the Y, leaving
   * [X,A] to fail against the second sequence. Swapping the two sequences will work, and more
   * generally we need to look at the full set of permutations over the nested constraints.
   *
   * However, simply brute forcing all permutations quickly hits performance problems. This can be
   * mitigated by only permuting the set of constraints that share values, and separately running
   * the rest in sequence (order won't matter). For example, given the following nested group:
   *
   *    grp(seq(A,B), grp(B,D), seq(K,L), seq(A,C), grp(M,N))
   *           1         2         3         4         5
   *
   * we want to test 3 and 5 in a single sequential pass and 1, 2, 4 via permutation.
   *
   * It is still possible for there to be enough constraints with common values to hit a factorial
   * explosion. To guard against this, [process] will throw a RuntimeException after an arbitrary
   * large number of attempts.
   */
  class NestGroup<T>(val constraints: List<Constraint<T>>) : Constraint<T>() {
    override val valueSet by lazy {
      mutableSetOf<T>().also { s -> constraints.forEach { s.addAll(it.valueSet) } }
    }

    private var safetyLimit = 0

    // Finds the set of "overlapping" constraints that have any common values.
    private val toPermute: Set<Constraint<T>> by lazy {
      // Build a map of value to constraint.
      val valuesToConstraints = mutableMapOf<T, MutableList<Constraint<T>>>()
      for (c in constraints) {
        for (value in c.valueSet) {
          val list = valuesToConstraints.getOrDefault(value, mutableListOf())
          list.add(c)
          valuesToConstraints[value] = list
        }
      }

      // Collect the constraints from all values that map to more than one constraint.
      mutableSetOf<Constraint<T>>().also {
        for (list in valuesToConstraints.values) {
          if (list.size > 1) {
            it.addAll(list)
          }
        }
      }
    }

    // Finds the set of "non-overlapping" constraints that do not have any common values.
    private val noPermute: Set<Constraint<T>> by lazy { constraints.toSet() - toPermute }

    override fun process(matches: ResultList<T>, from: Int, failFast: Boolean): Report<T> {
      maxIndex = -1
      safetyLimit = 0

      // First check that all the overlapping constraints can be satisfied individually against
      // the initial [matches] state to quickly catch errors where one contains a value that
      // simply isn't in the input.
      for (c in toPermute) {
        val report = c.process(matches, from, failFast)
        if (report !is Report.Success) {
          return report
        }
      }

      // Now run the non-overlapping constraints as a single sequential pass.
      var varMatches = matches
      for (c in noPermute) {
        val report = c.process(varMatches, from, failFast)
        if (report !is Report.Success) {
          return report
        }
        varMatches = report.matches
        maxIndex = Math.max(c.maxIndex, maxIndex)
      }

      // Finally explore permutations of the overlapping constraints. This will call [process]
      // with failFast on to disable the generation of error reports.
      val report = runPermutations(toPermute.toMutableList(), varMatches, from)
      if (report is Report.Success || failFast) {
        return report
      }

      // No luck. Re-run one of the orderings with failFast off to generate a sample error report.
      var sample: Report<T> = Report.FastFailure()
      for (c in toPermute) {
        sample = c.process(varMatches, from, false)
        if (sample !is Report.Success) {
          break
        }
        varMatches = sample.matches
      }
      return Report.MiscFailure(
        "no ordering found to satisfy constraints with common values in a nested group",
        "[Constraints]\n" + toPermute.joinToString("\n") + "\n\n[Sample failure]\n" + sample.body()
      )
    }

    // Recursively explore the permutation space for the given [candidates] list. Constraints are
    // executed as the ordering is built up (rather than building each ordering completely before
    // processing), so as soon as one fails we can prune any further sub-orderings from that point
    // on - this provides a massive performance improvement.
    private fun runPermutations(
      candidates: MutableList<Constraint<T>>,
      matches: ResultList<T>,
      from: Int
    ): Report<T> {
      if (candidates.isEmpty()) return Report.Success(matches)

      // This limit empirically allows up to 10 pathologically arranged overlapping constraints
      // to be successfully processed in a reasonable time.
      if (++safetyLimit == 2_000_000) {
        throw RuntimeException("NestGroup required too many permutations to complete: $this")
      }

      // At each level, run through the list of candidates, taking one from the front of the
      // list to process. On success, recurse on the reduced list; if the recursive call finds
      // a successful ordering, return immediately. On failure, do not recurse, thus pruning all
      // of the sub-orderings under this particular point.
      //
      // If we haven't found a successful ordering, add the popped front candidate to the end of
      // the candidates list and try the next one.
      repeat(candidates.size) {
        val candidate = candidates.removeAt(0)
        val report = candidate.process(matches, from, true)
        if (report is Report.Success) {
          maxIndex = Math.max(candidate.maxIndex, maxIndex)
          val subReport = runPermutations(candidates, report.matches, from)
          if (subReport is Report.Success) {
            return subReport
          }
        }
        candidates.add(candidate)
      }
      return Report.FastFailure()
    }

    override fun toString() = "grp(${constraints.joinToString(", ")})"
  }

  protected fun search(matches: ResultList<T>, value: T, from: Int): Int {
    (from until matches.size).forEach {
      if (matches[it].constraint == null && matches[it].value == value) return it
    }
    return -1
  }

  protected fun showIndexed(values: List<T>, index: Int) =
    values.mapIndexed { i, v -> if (i == index) ">$v<" else "$v" }.joinToString(", ")
}

/**
 * Holds the result of a [Constraint.process] call, and for failed constraints can generate
 * an AssertionError providing detailed information on how the constraint failed.
 */
sealed class Report<T> {

  /** Generate an AssertionError providing detailed information on how the constraint failed. */
  fun toException() = AssertionError("assertVariableOrdering: " + description() + "\n\n" + body())

  open fun description(): String = ""

  open fun body(): String = ""

  class Success<T>(val matches: ResultList<T>) : Report<T>()

  /** Reports a standard failure to match in a constraint. */
  class MatchFailure<T>(
    val label: String,
    val matches: ResultList<T>,
    val unmatched: List<Result<T>>
  ) : Report<T>() {
    override fun description() =
      "$label constraint failed with unmatched values: ${unmatched.map { it.value }}"

    override fun body(): String {
      val rows = mutableListOf(Row(' ', "Actual", "Match result"))
      var ai = 0
      var ui = 0
      while (ai < matches.size || ui < unmatched.size) {
        if (ai < matches.size && (ui == unmatched.size || ai < unmatched[ui].actualIndex)) {
          rows.add(Row('|', matches[ai].value.toString(), matches[ai].showIndexed(), ai))
          ai++
        } else {
          rows.add(Row(':', "", "?? " + unmatched[ui].showIndexed()))
          ui++
        }
      }
      return layout(rows)
    }
  }

  /** Reports other failures. */
  class MiscFailure<T>(val descriptionStr: String, val bodyStr: String) : Report<T>() {
    override fun description() = descriptionStr

    override fun body() = bodyStr
  }

  /** Used to speed up the handling of permutations in NestGroup processing. */
  class FastFailure<T> : Report<T>()

  class Row(val sep: Char, val left: String, val right: String, index: Int = -1) {
    val indexStr = if (index == -1) "" else index.toString()
  }

  companion object {
    fun <T> checkUnmatched(matches: ResultList<T>): Report<T> {
      val summary = mutableListOf<T>()
      val rows = matches.mapIndexed { ai, t ->
        if (t.constraint == null) {
          summary.add(t.value)
          Row('|', t.value.toString(), "<- unmatched", ai)
        } else {
          Row('|', t.value.toString(), "", ai)
        }
      }
      return if (summary.isEmpty()) {
        Report.Success(matches)
      } else {
        Report.MiscFailure(
          "all constraints satisfied but some values not matched: $summary",
          layout(rows)
        )
      }
    }

    protected fun layout(rows: List<Row>): String {
      var w1 = 1
      var w2 = 1
      rows.forEach {
        w1 = Math.max(w1, it.indexStr.length)
        w2 = Math.max(w2, it.left.length)
      }
      val rowStrings = rows.map {
        "%${w1}s %c %-${w2}s   %s".format(it.indexStr, it.sep, it.left, it.right).trimEnd()
      }
      return rowStrings.joinToString("\n")
    }
  }
}
