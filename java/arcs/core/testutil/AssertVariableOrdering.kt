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
  // Run top-level constraints in parallel; fail immediately if any do not succeed.
  val matches = actual.map { Result<T>(it) }
  constraints.forEach {
    val report = it.process(matches)
    if (report.isFailure) throw report.toException()
  }

  // Unless otherwise directed, fail when any values were not matched by at least one constraint.
  if (!allowUnmatched) {
    val report = Report.checkUnmatched(matches)
    if (report.isFailure) throw report.toException()
  }
}

/** Helpers for constructing value/nested sequences/groups. */
fun <T> sequence(vararg values: T) = Constraint.ValueSequence(values.toList())

fun <T> sequence(values: Iterable<T>) = Constraint.ValueSequence(values.toList())

fun <T> sequence(vararg constraints: Constraint<T>) = Constraint.NestSequence(constraints.toList())

fun <T> sequence(constraints: Iterable<Constraint<T>>) =
  Constraint.NestSequence(constraints.toList())

fun <T> group(vararg values: T) = Constraint.ValueGroup(values.toList())

fun <T> group(values: Iterable<T>) = Constraint.ValueGroup(values.toList())

fun <T> group(vararg constraints: Constraint<T>) = Constraint.NestGroup(constraints.toList())

fun <T> group(constraints: Iterable<Constraint<T>>) = Constraint.NestGroup(constraints.toList())

/** Holds the result of a [Constraint] match against a given value. */
class Result<T>(
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
   * Evaluates this constraint against the input list provided to [assertVariableOrdering],
   * starting at the [from] index.
   */
  abstract fun process(matches: List<Result<T>>, from: Int = 0): Report

  /**
   * For value-based constraints, shows the list of expected values with a specific one
   * highlighted: `seq(a, b, >c<, d)`. Unused for nesting constraints.
   */
  open fun showIndexed(i: Int): String = ""

  /** Represents a causally-ordered sequence of values. */
  class ValueSequence<T>(val values: List<T>) : Constraint<T>() {
    override fun process(matches: List<Result<T>>, from: Int): Report {
      var mutableFrom = from
      val unmatched = mutableListOf<Result<T>>()
      values.forEachIndexed { ci, value ->
        val ai = search(matches, value, mutableFrom)
        if (ai != null) {
          matches[ai].let {
            it.constraint = this
            it.constraintIndex = ci
            it.actualIndex = ai
          }
          maxIndex = ai
          mutableFrom = ai + 1
        } else {
          unmatched.add(Result(value, this, ci, mutableFrom))
        }
      }
      return if (unmatched.isEmpty()) {
        Report.success()
      } else {
        Report.failure("sequence", matches, unmatched)
      }
    }

    override fun showIndexed(i: Int) = "seq(${showIndexed(values, i)})"

    override fun toString() = values.toString()
  }

  /** Represents an unordered group of values. */
  class ValueGroup<T>(val values: List<T>) : Constraint<T>() {
    override fun process(matches: List<Result<T>>, from: Int): Report {
      val unmatched = mutableListOf<Result<T>>()
      values.forEachIndexed { ci, value ->
        val ai = search(matches, value, from)
        if (ai != null) {
          matches[ai].let {
            it.constraint = this
            it.constraintIndex = ci
            it.actualIndex = ai
          }
          maxIndex = Math.max(ai, maxIndex)
        } else {
          unmatched.add(Result(value, this, ci, 0))
        }
      }
      return if (unmatched.isEmpty()) {
        Report.success()
      } else {
        unmatched.forEach { it.actualIndex = Math.max(maxIndex + 1, from) }
        Report.failure("group", matches, unmatched)
      }
    }

    override fun showIndexed(i: Int) = "grp(${showIndexed(values, i)})"

    override fun toString() = "{" + values.joinToString(", ") + "}"
  }

  /** Represents a causally-ordered sequence of constraints. */
  class NestSequence<T>(val constraints: List<Constraint<T>>) : Constraint<T>() {
    override fun process(matches: List<Result<T>>, from: Int): Report {
      var mutableFrom = from
      constraints.forEach {
        val report = it.process(matches, mutableFrom)
        if (report.isFailure) {
          return report
        }
        maxIndex = it.maxIndex
        mutableFrom = maxIndex + 1
      }
      return Report.success()
    }

    override fun toString() = "<" + constraints.joinToString(", ") + ">"
  }

  /** Represents an unordered group of constraints. */
  class NestGroup<T>(val constraints: List<Constraint<T>>) : Constraint<T>() {
    override fun process(matches: List<Result<T>>, from: Int): Report {
      constraints.forEach {
        val report = it.process(matches, from)
        if (report.isFailure) {
          return report
        }
        maxIndex = it.maxIndex
      }
      return Report.success()
    }

    override fun toString() = "«" + constraints.joinToString(", ") + "»"
  }

  protected fun search(matches: List<Result<T>>, value: T, from: Int): Int? {
    (from..(matches.size - 1)).forEach {
      if (matches[it].constraint == null && matches[it].value == value) return it
    }
    return null
  }

  protected fun showIndexed(values: List<T>, index: Int) =
    values.mapIndexed { i, v -> if (i == index) ">$v<" else "$v" }.joinToString(", ")
}

/**
 * Holds the result of a [Constraint.process] call, and for failed constraints can generate
 * an AssertionError providing detailed information on how the constraint failed.
 */
class Report private constructor(
  val description: String,
  val rows: List<Row>
) {

  val isFailure = description.isNotEmpty()

  class Row(val sep: Char, val left: String, val right: String, index: Int = -1) {
    val indexStr = if (index == -1) "" else index.toString()
  }

  fun toException(): AssertionError {
    var w1 = 1
    var w2 = 1
    rows.forEach {
      w1 = Math.max(w1, it.indexStr.length)
      w2 = Math.max(w2, it.left.length)
    }
    val rowStrings = rows.map {
      "%${w1}s %c %-${w2}s   %s".format(it.indexStr, it.sep, it.left, it.right).trimEnd()
    }
    return AssertionError(description + "\n\n" + rowStrings.joinToString("\n"))
  }

  companion object {
    fun success() = Report("", emptyList())

    fun <T> failure(label: String, matches: List<Result<T>>, unmatched: List<Result<T>>): Report {
      val rows = mutableListOf(Row(' ', "Actual", "Match result"))
      var ai = 0
      var ui = 0
      while (ai < matches.size || ui < unmatched.size) {
        if (ai < matches.size && (ui == unmatched.size || ai < unmatched[ui].actualIndex)) {
          rows.add(Row('|', matches[ai].value.toString(), matches[ai].showIndexed(), ai))
          ai++
        } else {
          unmatched[ui].let { rows.add(Row(':', "", "?? " + it.showIndexed())) }
          ui++
        }
      }
      val summary = unmatched.map { it.value }
      val desc = "assertVariableOrdering: $label constraint failed with unmatched values: $summary"
      return Report(desc, rows)
    }

    fun <T> checkUnmatched(matches: List<Result<T>>): Report {
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
        Report.success()
      } else {
        val desc = "assertVariableOrdering: " +
          "all constraints satisfied but some values not matched: $summary"
        Report(desc, rows)
      }
    }
  }
}
