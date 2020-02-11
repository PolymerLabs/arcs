/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.wasm

import kotlin.AssertionError
import kotlin.test.Asserter

open class TestBase<T : WasmEntity>(
    val ctor: (txt: String) -> T,
    spec: WasmEntitySpec<T>
) : WasmParticleImpl(), Asserter {
    private val errors = WasmCollectionImpl(this, "errors", spec)

    private fun <T : WasmEntity> assertContainerEqual(
        container: WasmCollectionImpl<T>,
        converter: (T) -> String,
        expected: List<String>,
        isOrdered: Boolean = true
    ) {
        if (container.size != expected.size)
            fail("expected container to have ${expected.size} items; actual size ${container.size}")

        // Convert result values to strings and sort them when checking an unordered container.
        val converted = container.fetchAll().map(converter)
        val res = if (isOrdered) converted else converted.sorted()

        val comparison = expected zip res
        val marks = comparison.map { if (it.first == it.second) " " else "*" }
        val ok = marks.none { it.contains("*") }

        if (!ok) {
            val ordering = if (isOrdered) "ordered" else "unordered"
            val comparisonStrings = comparison.map {
                "Expected: ${it.first}\t|\tActual: ${it.second}"
            }
            val mismatches = (marks zip comparisonStrings).map { "${it.first} ${it.second}" }

            fail("Mismatched items in $ordering container: " +
                mismatches.joinToString(prefix = "\n", separator = "\n"))
        }
    }

    override fun fail(message: String?): Nothing {
        val err = if (message == null) ctor("Failure") else ctor(message)
        errors.store(err)

        if (message == null)
            throw AssertionError()
        else
            throw AssertionError(message)
    }

    fun assertFalse(message: String?, actual: Boolean) = super.assertTrue(message, !actual)

    fun assertFalse(
        lazyMessage: () -> String?,
        actual: Boolean
    ) = super.assertTrue(lazyMessage, !actual)
}
